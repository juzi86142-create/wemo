import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const specification = readFileSync(resolve(root, "网站重构需求.md"), "utf8");
const traceability = readFileSync(
  resolve(root, "docs", "requirements-traceability.md"),
  "utf8",
);
const taskBreakdown = readFileSync(
  resolve(root, "docs", "task-breakdown.md"),
  "utf8",
);

const explicitIds = [
  ...new Set(
    specification.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3}\b/g) ?? [],
  ),
].sort();
const missingIds = explicitIds.filter(
  (id) => !traceability.includes(`\`${id}\``),
);

const chapterNumbers = [...specification.matchAll(/^\s*# (\d+)\./gm)].map(
  (match) => match[1],
);
const missingChapters = chapterNumbers.filter(
  (chapter) => !traceability.includes(`需求第 ${chapter} 章`),
);

const appendices = ["A", "B", "C", "D", "E"];
const missingAppendices = appendices.filter(
  (appendix) => !traceability.includes(`需求附录 ${appendix}`),
);

const invalidResponsibilityPaths = [
  { name: "需求追踪矩阵", source: traceability },
  { name: "任务拆解", source: taskBreakdown },
].flatMap(({ name, source }) =>
  [...source.matchAll(/`([^`\r\n]+)`/g)].flatMap((match) => {
    const path = match[1];
    if (!path) return [];
    if (/^(?:storefront|api|ui)\//.test(path)) {
      return [`${name} 使用了非仓库相对路径 ${path}`];
    }
    if (
      /^(?:apps|packages|docs|scripts)(?:\/|$)/.test(path) &&
      !existsSync(resolve(root, path))
    ) {
      return [`${name} 引用了不存在的路径 ${path}`];
    }
    return [];
  }),
);

if (
  missingIds.length ||
  missingChapters.length ||
  missingAppendices.length ||
  invalidResponsibilityPaths.length
) {
  console.error("需求追踪矩阵不完整。");
  if (missingIds.length) console.error(`缺少需求 ID: ${missingIds.join(", ")}`);
  if (missingChapters.length) {
    console.error(`缺少章节: ${missingChapters.join(", ")}`);
  }
  if (missingAppendices.length) {
    console.error(`缺少附录: ${missingAppendices.join(", ")}`);
  }
  if (invalidResponsibilityPaths.length) {
    console.error(invalidResponsibilityPaths.join("\n"));
  }
  process.exit(1);
}

console.log(
  `需求追踪检查通过：${explicitIds.length} 个显式需求/页面 ID、${chapterNumbers.length} 个正文章节、${appendices.length} 个附录均已登记。`,
);
