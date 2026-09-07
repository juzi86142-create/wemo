import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { IntegrationAdapter, WebhookDelivery } from "@wemo/contracts";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";
import {
  INTEGRATIONS_REPOSITORY,
  type IntegrationTestResult,
  type IntegrationsRepository,
} from "./integrations.repository";

const CONFIGS_KEY = `${REDIS_KEY_PREFIX}:integrations`;
const WEBHOOK_DELIVERIES_KEY = `${REDIS_KEY_PREFIX}:integrations:webhook-deliveries`;

/** 外部集成配置持久化在 Redis hash */
@Injectable()
export class IntegrationsRedisRepository implements IntegrationsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 创建集成配置 初始状态 healthy */
  async createIntegration(input: {
    code?: string;
    kind?: IntegrationAdapter["kind"];
    provider?: string;
    metadata?: unknown;
  }): Promise<IntegrationAdapter> {
    const adapter: IntegrationAdapter = {
      id: await redisNextId(this.redis, `${REDIS_KEY_PREFIX}:integrations:next`),
      code: input.code ?? `integration-${Date.now()}`,
      kind: (input.kind ?? "webhook") as IntegrationAdapter["kind"],
      provider: input.provider ?? "local",
      status: "healthy",
      last_checked_at: null,
      last_error: null,
      capabilities: [],
      metadata: (input.metadata ?? {}) as IntegrationAdapter["metadata"],
    };
    await writeHashObject(this.redis, CONFIGS_KEY, adapter.id, adapter);
    return adapter;
  }

  /** 按 id 查询集成配置 */
  async getIntegrationById(id: number): Promise<IntegrationAdapter | null> {
    return readHashOne<IntegrationAdapter>(
      this.redis,
      CONFIGS_KEY,
      id,
      (raw) => JSON.parse(raw) as IntegrationAdapter,
    );
  }

  /** 分页列出集成配置 */
  async listIntegrations(query: { page: number; page_size: number }): Promise<{
    items: IntegrationAdapter[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const items = await readHashAll<IntegrationAdapter>(
      this.redis,
      CONFIGS_KEY,
      (raw) => JSON.parse(raw) as IntegrationAdapter,
    );
    return paginate(items, query, { sortBy: (a, b) => a.id - b.id });
  }

  /** 更新集成配置并刷新最近检查时间 */
  async updateIntegration(
    id: number,
    input: {
      code?: string;
      provider?: string;
      status?: IntegrationAdapter["status"];
      metadata?: unknown;
    },
  ): Promise<IntegrationAdapter> {
    const existing = await this.getIntegrationById(id);
    if (!existing) {
      throw new NotFoundException(`集成 ${id} 不存在`);
    }
    const updated: IntegrationAdapter = {
      ...existing,
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.provider !== undefined ? { provider: input.provider } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as IntegrationAdapter["metadata"] }
        : {}),
      last_checked_at: new Date().toISOString(),
    };
    await writeHashObject(this.redis, CONFIGS_KEY, id, updated);
    return updated;
  }

  /** 持久化一条 Webhook 投递记录 */
  async recordWebhookDelivery(input: {
    integration_id: number;
    provider: string;
    event: string;
    status: WebhookDelivery["status"];
    idempotency_key: string;
    request_id: string;
    attempt_count: number;
    failure_reason: string | null;
    payload: unknown;
    response: unknown;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  }): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:integrations:webhook-deliveries:next`,
      ),
      integration_id: input.integration_id,
      provider: input.provider,
      event: input.event,
      status: input.status,
      idempotency_key: input.idempotency_key,
      request_id: input.request_id,
      attempt_count: input.attempt_count,
      failure_reason: input.failure_reason,
      payload: input.payload as WebhookDelivery["payload"],
      response: input.response as WebhookDelivery["response"],
      created_at: input.created_at,
      updated_at: input.updated_at,
      completed_at: input.completed_at,
    };
    await writeHashObject(
      this.redis,
      WEBHOOK_DELIVERIES_KEY,
      delivery.id,
      delivery,
    );
    return delivery;
  }

  /** 分页查询 Webhook 投递记录 */
  async listWebhookDeliveries(query: {
    page: number;
    page_size: number;
    provider?: string | undefined;
  }): Promise<{
    items: WebhookDelivery[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const deliveries = await readHashAll<WebhookDelivery>(
      this.redis,
      WEBHOOK_DELIVERIES_KEY,
      (raw) => JSON.parse(raw) as WebhookDelivery,
    );
    return paginate(deliveries, query, {
      exact: { provider: query.provider },
      sortBy: (a, b) => b.created_at.localeCompare(a.created_at),
    });
  }

  /** 测试集成连接 按当前状态返回健康结果 */
  async testConnection(id: number): Promise<IntegrationTestResult> {
    const existing = await this.getIntegrationById(id);
    if (!existing) {
      throw new NotFoundException(`集成 ${id} 不存在`);
    }
    return {
      success: existing.status === "healthy",
      message: existing.status === "healthy" ? "连接正常" : "连接异常",
      response_time_ms: 0,
    };
  }
}
