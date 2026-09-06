import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { NOTIFICATIONS_REPOSITORY, type NotificationsRepository } from "./notifications.repository";
import type { NotificationTemplate, NotificationDelivery } from "@wemo/contracts";

@Injectable()
export class NotificationsPrismaRepository implements NotificationsRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async listNotificationTemplates(): Promise<{ items: NotificationTemplate[]; total: number; page: number; page_size: number }> {
    const [templates, total] = await Promise.all([
      this.database.notificationTemplate.findMany(),
      this.database.notificationTemplate.count(),
    ]);

    return {
      items: templates.map(t => this.mapTemplate(t)),
      total,
      page: 1,
      page_size: total,
    };
  }

  async upsertNotificationTemplate(input: any): Promise<NotificationTemplate> {
    const template = await this.database.notificationTemplate.upsert({
      where: { id: input.id ?? 0 },
      create: {
        key: input.key,
        name: input.name,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
      },
      update: {
        name: input.name,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
      },
    });

    return this.mapTemplate(template);
  }

  async getNotificationTemplateById(id: number): Promise<NotificationTemplate | null> {
    const template = await this.database.notificationTemplate.findUnique({
      where: { id },
    });

    return template ? this.mapTemplate(template) : null;
  }

  async listNotificationDeliveries(query: any): Promise<{ items: NotificationDelivery[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.recipient_user_id) where.userId = query.recipient_user_id;
    if (query.status) where.status = query.status;

    const [deliveries, total] = await Promise.all([
      this.database.notificationDelivery.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.notificationDelivery.count({ where }),
    ]);

    return {
      items: deliveries.map(d => this.mapDelivery(d)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async recordNotificationDelivery(input: any): Promise<NotificationDelivery> {
    const delivery = await this.database.notificationDelivery.create({
      data: {
        userId: input.recipient_user_id,
        companyId: input.company_id,
        templateKey: input.template_key || input.kind,
        channel: input.channel,
        status: "queued",
        payload: input.payload || {},
        sentAt: input.status === "sent" ? new Date() : null,
      },
    });

    return this.mapDelivery(delivery);
  }

  async getNotificationDeliveryById(id: number): Promise<NotificationDelivery | null> {
    const delivery = await this.database.notificationDelivery.findUnique({
      where: { id },
    });

    return delivery ? this.mapDelivery(delivery) : null;
  }

  async retryNotificationDelivery(id: number, requestId: string, reason: string): Promise<NotificationDelivery> {
    const delivery = await this.database.notificationDelivery.update({
      where: { id },
      data: {
        status: "queued",
      },
    });

    return this.mapDelivery(delivery);
  }

  private mapTemplate(template: any): NotificationTemplate {
    return {
      id: template.id,
      key: template.key,
      name: template.name,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
    };
  }

  private mapDelivery(delivery: any): NotificationDelivery {
    return {
      id: delivery.id,
      recipient_user_id: delivery.userId,
      company_id: delivery.companyId,
      kind: delivery.templateKey,
      channel: delivery.channel,
      status: delivery.status,
      payload: delivery.payload,
      sent_at: delivery.sentAt?.toISOString() || null,
      created_at: delivery.createdAt.toISOString(),
    };
  }
}
