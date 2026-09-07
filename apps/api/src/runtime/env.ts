import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 环境配置的单一来源 仓库根目录的 .env（全仓仅此一份）
 * 从当前模块位置逐级向上定位 源码运行与打包产物路径深度不同但结果一致
 */
export function loadEnvFile(): void {
  let dir = import.meta.dirname;
  for (let level = 0; level < 6; level += 1) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    dir = resolve(dir, "..");
  }
}
