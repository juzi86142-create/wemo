import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";

interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface WorkspacePackage {
  path: string;
  manifest: PackageManifest;
}

const root = resolve(import.meta.dirname, "..");
const failures: string[] = [];

function directories(path: string): string[] {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(path, entry.name));
}

const workspacePackages = [
  ...directories(join(root, "apps")),
  ...directories(join(root, "packages")),
].filter((path) => existsSync(join(path, "package.json")));
const appPackages = directories(join(root, "apps")).filter((path) =>
  existsSync(join(path, "package.json")),
);

const workspaceMetadata: WorkspacePackage[] = workspacePackages.map((path) => ({
  path,
  manifest: JSON.parse(
    readFileSync(join(path, "package.json"), "utf8"),
  ) as PackageManifest,
}));

const namedWorkspacePackages = workspaceMetadata.filter(
  ({ manifest, path }) => {
    if (manifest.name) return true;
    failures.push(`${relative(root, path)} 的 package.json 缺少 name`);
    return false;
  },
);
const workspaceNames = new Set(
  namedWorkspacePackages.flatMap(({ manifest }) => manifest.name ?? []),
);

if (workspaceNames.size !== namedWorkspacePackages.length) {
  failures.push("workspace package name 必须唯一");
}

const sharedPackageNames = new Set(
  namedWorkspacePackages.flatMap(({ manifest, path }) =>
    relative(root, path).startsWith(
      `packages${process.platform === "win32" ? "\\" : "/"}`,
    )
      ? (manifest.name ?? [])
      : [],
  ),
);
const allowedWorkspaceDependencies = new Map<string, ReadonlySet<string>>([
  ["@wemo/api", sharedPackageNames],
  ["@wemo/storefront", new Set(["@wemo/contracts", "@wemo/ui"])],
  ["@wemo/contracts", new Set()],
  ["@wemo/database", new Set(["@wemo/contracts"])],
  ["@wemo/ui", new Set(["@wemo/contracts"])],
]);

for (const { manifest, path } of namedWorkspacePackages) {
  const packageName = manifest.name;
  if (!packageName) continue;

  const allowedDependencies = allowedWorkspaceDependencies.get(packageName);
  if (!allowedDependencies) {
    failures.push(`${relative(root, path)} 缺少 workspace 依赖方向规则`);
    continue;
  }

  const declaredDependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };
  for (const dependencyName of Object.keys(declaredDependencies)) {
    if (
      workspaceNames.has(dependencyName) &&
      !allowedDependencies.has(dependencyName)
    ) {
      failures.push(`${packageName} 不得依赖 workspace 包 ${dependencyName}`);
    }
  }
}

for (const packagePath of workspacePackages) {
  for (const guide of ["AGENTS.md", "README.md"]) {
    if (!existsSync(join(packagePath, guide))) {
      failures.push(`${relative(root, packagePath)} 缺少 ${guide}`);
    }
  }
}

const frontendPackages = appPackages.filter((packagePath) => {
  const manifest = JSON.parse(
    readFileSync(join(packagePath, "package.json"), "utf8"),
  ) as PackageManifest;
  return Boolean(
    manifest.dependencies?.react ?? manifest.devDependencies?.react,
  );
});

if (
  frontendPackages.length !== 1 ||
  relative(root, frontendPackages[0] ?? "") !== join("apps", "storefront")
) {
  failures.push("必须且只能存在 apps/storefront 一个 React 前端应用");
}

const expectedApps = directories(join(root, "apps"))
  .filter((path) => existsSync(join(path, "package.json")))
  .map((path) => relative(join(root, "apps"), path))
  .sort();
if (expectedApps.join(",") !== "api,storefront") {
  failures.push("apps 只能包含 storefront 前端和 api 单体后端两个应用包");
}

const moduleRoots = [
  join(root, "apps", "api", "src", "modules"),
  join(root, "apps", "storefront", "src", "features"),
  join(root, "packages", "contracts", "src"),
  join(root, "packages", "database", "prisma", "domains"),
  join(root, "packages", "ui", "src"),
];

for (const moduleRoot of moduleRoots) {
  for (const modulePath of directories(moduleRoot)) {
    if (!existsSync(join(modulePath, "README.md"))) {
      failures.push(`${relative(root, modulePath)} 缺少 README.md`);
    }
  }
}

const prismaSchema = join(
  root,
  "packages",
  "database",
  "prisma",
  "schema.prisma",
);
if (!existsSync(prismaSchema)) {
  failures.push("packages/database/prisma/schema.prisma 不存在");
} else {
  const schema = readFileSync(prismaSchema, "utf8");
  if (!/relationMode\s*=\s*"prisma"/i.test(schema)) {
    failures.push('Prisma schema 必须设置 relationMode = "prisma"');
  }
  if (/\bString\s+@id\b|@default\(uuid\(\)\)|@db\.Uuid/i.test(schema)) {
    failures.push("Prisma schema 的实体主键必须使用自增整数，禁止 UUID 主键");
  }
}

const skippedDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "dist",
  "node_modules",
]);

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry: Dirent) => {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) return [];
    const entryPath = join(path, entry.name);
    return entry.isDirectory() ? sourceFiles(entryPath) : [entryPath];
  });
}

const javascriptFiles = sourceFiles(root).filter((path) =>
  [".js", ".jsx", ".mjs", ".cjs"].includes(extname(path)),
);
if (javascriptFiles.length) {
  failures.push(
    `发现非生成的 JavaScript 文件：${javascriptFiles.map((path) => relative(root, path)).join(", ")}`,
  );
}

function isWithin(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function moduleSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const staticImportPattern =
    /(?:import|export)\s+(?:type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportPattern = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [staticImportPattern, dynamicImportPattern]) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

for (const { manifest, path: packagePath } of namedWorkspacePackages) {
  const packageName = manifest.name;
  if (!packageName) continue;

  const declaredDependencies = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);

  for (const sourcePath of sourceFiles(packagePath).filter((path) =>
    [".ts", ".tsx"].includes(extname(path)),
  )) {
    const source = readFileSync(sourcePath, "utf8");
    for (const specifier of moduleSpecifiers(source)) {
      const importedWorkspaceName = [...workspaceNames].find(
        (name) => specifier === name || specifier.startsWith(`${name}/`),
      );
      if (
        importedWorkspaceName &&
        importedWorkspaceName !== packageName &&
        !declaredDependencies.has(importedWorkspaceName)
      ) {
        failures.push(
          `${relative(root, sourcePath)} 导入了未声明的 workspace 依赖 ${importedWorkspaceName}`,
        );
      }

      if (!specifier.startsWith(".")) continue;

      const targetPath = resolve(dirname(sourcePath), specifier);
      const targetPackage = namedWorkspacePackages.find(({ path }) =>
        isWithin(path, targetPath),
      );
      if (targetPackage && targetPackage.path !== packagePath) {
        failures.push(
          `${relative(root, sourcePath)} 不得通过相对路径跨入 ${relative(root, targetPackage.path)}`,
        );
      }
    }
  }
}

if (failures.length) {
  console.error("架构基线检查失败：");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `架构检查通过：${workspacePackages.length} 个包均有包内指南，只有 1 个 React 前端、1 个单体 API，依赖方向和跨包导入符合约束，所有子模块均有 README，未发现 JavaScript 源文件。`,
);
