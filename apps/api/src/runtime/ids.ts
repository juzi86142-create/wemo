import { randomUUID } from "node:crypto";

/** 生成业务单号 前缀加时间戳与随机段 */
export function generateBusinessNo(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().slice(0, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}
