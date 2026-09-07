import type { Redis } from "ioredis";

/** 读取 Redis hash 全部值并解码为对象列表 */
export async function readHashAll<T>(
  client: Redis,
  key: string,
  decode: (raw: string) => T,
): Promise<T[]> {
  const raw = await client.hgetall(key);
  return Object.values(raw).map((value) => decode(value));
}

/** 读取 Redis hash 单个字段并解码 */
export async function readHashOne<T>(
  client: Redis,
  key: string,
  field: string | number,
  decode: (raw: string) => T,
): Promise<T | null> {
  const raw = await client.hget(key, String(field));
  return raw ? decode(raw) : null;
}

/** 写入 Redis hash 单个字段 内部 JSON 序列化 */
export async function writeHashObject(
  client: Redis,
  key: string,
  field: string | number,
  value: unknown,
): Promise<void> {
  await client.hset(key, String(field), JSON.stringify(value));
}

/** 获取自增 ID 计数器的下一个值 */
export async function redisNextId(
  client: Redis,
  scope: string,
): Promise<number> {
  return client.incr(scope);
}
