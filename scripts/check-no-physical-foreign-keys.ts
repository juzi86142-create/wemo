import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const databaseRoot = resolve(import.meta.dirname, "..", "packages", "database");
const forbidden = [
  { label: "Prisma foreignKeys relationMode", pattern: /relationMode\s*=\s*"foreignKeys"/i },
  { label: "物理关系 references()", pattern: /\.references\s*\(/i },
  { label: "SQL FOREIGN KEY", pattern: /\bFOREIGN\s+KEY\b/i },
  { label: "SQL REFERENCES", pattern: /\bREFERENCES\s+[\w".]+\s*\(/i },
  { label: "UUID 主键", pattern: /@default\(uuid\(\)\)|@db\.Uuid|\bString\s+@id\b/i },
];

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return [path];
  });
}

const violations = collectFiles(databaseRoot)
  .filter((path) => [".ts", ".sql", ".prisma"].includes(extname(path)))
  .flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return forbidden
      .filter(({ pattern }) => pattern.test(source))
      .map(({ label }) => `${path}: ${label}`);
  });

if (violations.length) {
  console.error("检测到物理外键定义：");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("数据库检查通过：未发现 Prisma/SQL 物理外键定义，且已扫描 Prisma schema。");
