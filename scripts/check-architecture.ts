import {
  existsSync,
  readdirSync,
  readFileSync,
  type Dirent,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";

interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
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
  return Boolean(manifest.dependencies?.react ?? manifest.devDependencies?.react);
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

const prismaSchema = join(root, "packages", "database", "prisma", "schema.prisma");
if (!existsSync(prismaSchema)) {
  failures.push("packages/database/prisma/schema.prisma 不存在");
} else {
  const schema = readFileSync(prismaSchema, "utf8");
  if (!/relationMode\s*=\s*"prisma"/i.test(schema)) {
    failures.push("Prisma schema 必须设置 relationMode = \"prisma\"");
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

if (failures.length) {
  console.error("架构基线检查失败：");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `架构检查通过：${workspacePackages.length} 个包均有包内指南，只有 1 个 React 前端、1 个单体 API，所有子模块均有 README，未发现 JavaScript 源文件。`,
);
