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
    const raw = await this.redis.hgetall(TEMPLATES_KEY);
    const templates = Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as NotificationTemplate)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const start = (query.page - 1) * query.page_size;
    return {
      items: templates.slice(start, start + query.page_size),
      total: templates.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  /** 按 id 更新或新建通知模板 */
  async upsertTemplate(
    input: NotificationTemplateUpdateInput & { id?: number },
  ): Promise<NotificationTemplate> {
    if (input.id !== undefined) {
      const existingRaw = await this.redis.hget(
        TEMPLATES_KEY,
        String(input.id),
      );
      if (!existingRaw) {
        throw new NotFoundException(`通知模板 ${input.id} 不存在`);
      }
      const existing = JSON.parse(existingRaw) as NotificationTemplate;
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
      await this.redis.hset(
        TEMPLATES_KEY,
        String(updated.id),
        JSON.stringify(updated),
      );
      return updated;
    }

    const now = new Date().toISOString();
    const template: NotificationTemplate = {
      id: await this.redis.incr(
        `${REDIS_KEY_PREFIX}:notifications:templates:next`,
      ),
      code: input.code ?? "",
      audience: (input.audience ?? "user") as NotificationTemplate["audience"],
      channel: input.channel ?? "",
      locale: input.locale ?? "en-US",
      subject: input.subject ?? "",
      body: input.body ?? "",
      variables: input.variables ?? [],
      category: input.category ?? "",
      active: input.active ?? true,
      created_at: now,
      updated_at: now,
    } as NotificationTemplate;
    await this.redis.hset(
      TEMPLATES_KEY,
      String(template.id),
      JSON.stringify(template),
    );
    return template;
  }

  /** 按 id 查询通知模板 */
  async getNotificationTemplateById(
    id: number,
  ): Promise<NotificationTemplate | null> {
    const raw = await this.redis.hget(TEMPLATES_KEY, String(id));
    return raw ? (JSON.parse(raw) as NotificationTemplate) : null;
  }

  /** 按收件人 企业 受众 状态过滤分页查询投递记录 */
  async listDeliveries(
    query: NotificationDeliveryListQuery,
  ): Promise<NotificationPage<NotificationDelivery>> {
    const raw = await this.redis.hgetall(DELIVERIES_KEY);
    let deliveries = Object.entries(raw)
      .map(([, value]) => JSON.parse(value) as NotificationDelivery)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (query.recipient_user_id !== undefined) {
      deliveries = deliveries.filter(
        (d) => d.recipient_user_id === query.recipient_user_id,
      );
    }
    if (query.company_id !== undefined) {
      deliveries = deliveries.filter((d) => d.company_id === query.company_id);
    }
    if (query.audience !== undefined) {
      deliveries = deliveries.filter((d) => d.audience === query.audience);
    }
    if (query.status !== undefined) {
      deliveries = deliveries.filter((d) => d.status === query.status);
    }

    const start = (query.page - 1) * query.page_size;
    return {
      items: deliveries.slice(start, start + query.page_size),
      total: deliveries.length,
      page: query.page,
      page_size: query.page_size,
    };
  }

  /** 写入一条通知投递记录 */
  async recordDelivery(
    input: NotificationDeliveryCreateInput & { request_id: string },
  ): Promise<NotificationDelivery> {
    const now = new Date().toISOString();
    const delivery: NotificationDelivery = {
      id: await this.redis.incr(
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
    await this.redis.hset(
      DELIVERIES_KEY,
      String(delivery.id),
      JSON.stringify(delivery),
    );
    return delivery;
  }

  /** 按 id 查询投递记录 */
  async getNotificationDeliveryById(
    id: number,
  ): Promise<NotificationDelivery | null> {
    const raw = await this.redis.hget(DELIVERIES_KEY, String(id));
    return raw ? (JSON.parse(raw) as NotificationDelivery) : null;
  }

  /** 将投递记录重置为待发送并递增尝试次数 */
  async retryDelivery(
    id: number,
    reason?: string,
  ): Promise<NotificationDelivery> {
    const raw = await this.redis.hget(DELIVERIES_KEY, String(id));
    if (!raw) {
      throw new NotFoundException(`通知投递 ${id} 不存在`);
    }
    const delivery = JSON.parse(raw) as NotificationDelivery;
    const updated: NotificationDelivery = {
      ...delivery,
      status: "queued",
      attempts: delivery.attempts + 1,
      failure_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    };
    await this.redis.hset(DELIVERIES_KEY, String(id), JSON.stringify(updated));
    return updated;
  }
}
