import type { NotificationDelivery, NotificationDeliveryCreateInput, NotificationDeliveryListQuery, NotificationTemplate, NotificationTemplateCreateInput, NotificationTemplateUpdateInput, NotificationTemplateListResponse } from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

export const NOTIFICATIONS_REPOSITORY = Symbol("NOTIFICATIONS_REPOSITORY");

export interface NotificationsRepository {
  listNotificationTemplates(): Promise<{ items: NotificationTemplate[]; total: number; page: number; page_size: number }>;
  upsertNotificationTemplate(input: NotificationTemplateCreateInput & { id?: number }): Promise<NotificationTemplate>;
  getNotificationTemplateById(id: number): Promise<NotificationTemplate | null>;
  listNotificationDeliveries(query: NotificationDeliveryListQuery): Promise<{ items: NotificationDelivery[]; total: number; page: number; page_size: number }>;
  recordNotificationDelivery(input: NotificationDeliveryCreateInput & { request_id?: string }): Promise<NotificationDelivery>;
  getNotificationDeliveryById(id: number): Promise<NotificationDelivery | null>;
  retryNotificationDelivery(id: number, requestId: string, reason: string): Promise<NotificationDelivery>;
}
