import { Inject, Injectable } from "@nestjs/common";
import type {
  NotificationDelivery,
  NotificationDeliveryCreateInput,
  NotificationDeliveryListQuery,
  NotificationTemplate,
  NotificationTemplateUpdateInput,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";
import { DATABASE_CLIENT } from "../../database/database.constants";

import {
  type NotificationPage,
  type NotificationsRepository,
} from "./notifications.repository";

const DEMO_NOTIFICATION_NOT_SUPPORTED = "Demo模式：暂不支持通知持久化";

/**
 * Demo 模式：notification_templates / notification_deliveries 表已从数据库中移除，
 * 列表返回空分页，模板/重试类写操作抛错，recordDelivery 仅返回合成记录。
 */
@Injectable()
export class NotificationsPrismaRepository implements NotificationsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listTemplates(query: {
    page: number;
    page_size: number;
  }): Promise<NotificationPage<NotificationTemplate>> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async upsertTemplate(
    input: NotificationTemplateUpdateInput & { id?: number },
  ): Promise<NotificationTemplate> {
    throw new Error(DEMO_NOTIFICATION_NOT_SUPPORTED);
  }

  async getNotificationTemplateById(id: number): Promise<NotificationTemplate | null> {
    return null;
  }

  async listDeliveries(
    query: NotificationDeliveryListQuery,
  ): Promise<NotificationPage<NotificationDelivery>> {
    return { items: [], total: 0, page: query.page, page_size: query.page_size };
  }

  async recordDelivery(
    input: NotificationDeliveryCreateInput & { request_id: string },
  ): Promise<NotificationDelivery> {
    console.log(`[notifications:demo] recordDelivery 忽略持久化`, {
      template_code: input.template_code,
      request_id: input.request_id,
    });

    const now = new Date().toISOString();
    return {
      id: Date.now(),
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
  }

  async getNotificationDeliveryById(id: number): Promise<NotificationDelivery | null> {
    return null;
  }

  async retryDelivery(id: number, reason?: string): Promise<NotificationDelivery> {
    throw new Error(DEMO_NOTIFICATION_NOT_SUPPORTED);
  }
}
