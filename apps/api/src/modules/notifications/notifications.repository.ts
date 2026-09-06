import type {
  NotificationDelivery,
  NotificationDeliveryCreateInput,
  NotificationDeliveryListQuery,
  NotificationTemplate,
  NotificationTemplateUpdateInput,
} from "@wemo/contracts";

export const NOTIFICATIONS_REPOSITORY = Symbol("NOTIFICATIONS_REPOSITORY");

export type NotificationPage<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export interface NotificationsRepository {
  listTemplates(query: {
    page: number;
    page_size: number;
  }): Promise<NotificationPage<NotificationTemplate>>;
  upsertTemplate(
    input: NotificationTemplateUpdateInput & { id?: number },
  ): Promise<NotificationTemplate>;
  getNotificationTemplateById(id: number): Promise<NotificationTemplate | null>;
  listDeliveries(
    query: NotificationDeliveryListQuery,
  ): Promise<NotificationPage<NotificationDelivery>>;
  recordDelivery(
    input: NotificationDeliveryCreateInput & { request_id: string },
  ): Promise<NotificationDelivery>;
  getNotificationDeliveryById(id: number): Promise<NotificationDelivery | null>;
  retryDelivery(id: number, reason?: string): Promise<NotificationDelivery>;
}
