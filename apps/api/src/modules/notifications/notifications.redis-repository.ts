import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type {
  NotificationDelivery,
  NotificationDeliveryCreateInput,
  NotificationDeliveryListQuery,
  NotificationTemplate,
  NotificationTemplateUpdateInput,
} from "@wemo/contracts";

import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";
import {
  NOTIFICATIONS_REPOSITORY,
  type NotificationPage,
  type NotificationsRepository,
} from "./notifications.repository";

const TEMPLATES_KEY = `${REDIS_KEY_PREFIX}:notifications:templates`;
const DELIVERIES_KEY = `${REDIS_KEY_PREFIX}:notifications:deliveries`;

/** 通知模板与投递记录持久化在 Redis hash */
@Injectable()
export class NotificationsRedisRepository implements NotificationsRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 分页列出通知模板 */
  async listTemplates(query: {
    page: number;
    page_size: number;
  }): Promise<NotificationPage<NotificationTemplate>> {
    const templates = await readHashAll<NotificationTemplate>(
      this.redis,
      TEMPLATES_KEY,
      (raw) => JSON.parse(raw) as NotificationTemplate,
    );
    return paginate(templates, query, {
      sortBy: (a, b) => a.created_at.localeCompare(b.created_at),
    });
  }

  /** 按 id 更新或新建通知模板 */
  async upsertTemplate(
    input: NotificationTemplateUpdateInput & { id?: number },
  ): Promise<NotificationTemplate> {
    if (input.id !== undefined) {
      const existing = await readHashOne<NotificationTemplate>(
        this.redis,
        TEMPLATES_KEY,
        input.id,
        (raw) => JSON.parse(raw) as NotificationTemplate,
      );
      if (!existing) {
        throw new NotFoundException(`通知模板 ${input.id} 不存在`);
      }
      const updated: NotificationTemplate = {
        ...existing,
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.audience !== undefined ? { audience: input.audience } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.variables !== undefined
          ? { variables: input.variables }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        id: existing.id,
        updated_at: new Date().toISOString(),
      };
      await writeHashObject(this.redis, TEMPLATES_KEY, updated.id, updated);
      return updated;
    }

    const now = new Date().toISOString();
    const template: NotificationTemplate = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:notifications:templates:next`,
      ),
      // 新建模板的必填字段由 NotificationTemplateCreateSchema 保证 此处直读输入
      code: input.code ?? "",
      audience: input.audience ?? "user",
      channel: input.channel ?? "",
      locale: input.locale ?? "en-US",
      subject: input.subject ?? "",
      body: input.body ?? "",
      variables: input.variables ?? [],
      category: input.category ?? "",
      active: input.active ?? true,
      created_at: now,
      updated_at: now,
    };
    await writeHashObject(this.redis, TEMPLATES_KEY, template.id, template);
    return template;
  }

  /** 按 id 查询通知模板 */
  async getNotificationTemplateById(
    id: number,
  ): Promise<NotificationTemplate | null> {
    return readHashOne<NotificationTemplate>(
      this.redis,
      TEMPLATES_KEY,
      id,
      (raw) => JSON.parse(raw) as NotificationTemplate,
    );
  }

  /** 按收件人 企业 受众 状态过滤分页查询投递记录 */
  async listDeliveries(
    query: NotificationDeliveryListQuery,
  ): Promise<NotificationPage<NotificationDelivery>> {
    const deliveries = await readHashAll<NotificationDelivery>(
      this.redis,
      DELIVERIES_KEY,
      (raw) => JSON.parse(raw) as NotificationDelivery,
    );
    return paginate(deliveries, query, {
      exact: {
        recipient_user_id: query.recipient_user_id,
        company_id: query.company_id,
        audience: query.audience,
        status: query.status,
      },
      sortBy: (a, b) => b.created_at.localeCompare(a.created_at),
    });
  }

  /** 写入一条通知投递记录 */
  async recordDelivery(
    input: NotificationDeliveryCreateInput & { request_id: string },
  ): Promise<NotificationDelivery> {
    const now = new Date().toISOString();
    const delivery: NotificationDelivery = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:notifications:deliveries:next`,
      ),
      template_code: input.template_code,
      recipient_user_id: input.recipient_user_id ?? null,
      company_id: input.company_id ?? null,
      audience: input.audience,
      channel: input.channel,
      status: input.status ?? "queued",
      request_id: input.request_id,
      payload: input.payload,
      attempts: 0,
      provider_message_id: input.provider_message_id ?? null,
      failure_reason: input.failure_reason ?? null,
      created_at: now,
      sent_at: null,
      updated_at: now,
    };
    await writeHashObject(this.redis, DELIVERIES_KEY, delivery.id, delivery);
    return delivery;
  }

  /** 按 id 查询投递记录 */
  async getNotificationDeliveryById(
    id: number,
  ): Promise<NotificationDelivery | null> {
    return readHashOne<NotificationDelivery>(
      this.redis,
      DELIVERIES_KEY,
      id,
      (raw) => JSON.parse(raw) as NotificationDelivery,
    );
  }

  /** 将投递记录重置为待发送并递增尝试次数 */
  async updateDeliveryResult(
    id: number,
    result: {
      status: "sent" | "failed";
      provider_message_id: string | null;
      failure_reason: string | null;
    },
  ): Promise<NotificationDelivery | null> {
    const delivery = await readHashOne<NotificationDelivery>(
      this.redis,
      DELIVERIES_KEY,
      id,
      (raw) => JSON.parse(raw) as NotificationDelivery,
    );
    if (!delivery) return null;
    const updated: NotificationDelivery = {
      ...delivery,
      status: result.status,
      provider_message_id: result.provider_message_id ?? delivery.provider_message_id,
      failure_reason: result.failure_reason ?? delivery.failure_reason,
      sent_at:
        result.status === "sent"
          ? new Date().toISOString()
          : delivery.sent_at,
      updated_at: new Date().toISOString(),
    };
    await writeHashObject(this.redis, DELIVERIES_KEY, id, updated);
    return updated;
  }

  async retryDelivery(
    id: number,
    reason?: string,
  ): Promise<NotificationDelivery> {
    const delivery = await readHashOne<NotificationDelivery>(
      this.redis,
      DELIVERIES_KEY,
      id,
      (raw) => JSON.parse(raw) as NotificationDelivery,
    );
    if (!delivery) {
      throw new NotFoundException(`通知投递 ${id} 不存在`);
    }
    const updated: NotificationDelivery = {
      ...delivery,
      status: "queued",
      attempts: delivery.attempts + 1,
      failure_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    };
    await writeHashObject(this.redis, DELIVERIES_KEY, id, updated);
    return updated;
  }
}
