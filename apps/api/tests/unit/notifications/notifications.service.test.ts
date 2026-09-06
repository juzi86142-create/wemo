import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../../runtime/request-context.store";
import type { ExperienceStateStore } from "../../../runtime/experience.state";
import type { PlatformStateStore } from "../../../runtime/platform-state.store";
import type { AuthorizationService } from "../../../runtime/authorization.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let stateStore: ExperienceStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      listNotificationTemplates: vi.fn(),
      upsertNotificationTemplate: vi.fn(),
      getNotificationTemplateById: vi.fn(),
      listNotificationDeliveries: vi.fn(),
      recordNotificationDelivery: vi.fn(),
      retryNotificationDelivery: vi.fn(),
    } as any;

    platformState = {
      recordAudit: vi.fn(),
    } as any;

    authorization = {
      requireStaffPermission: vi.fn(),
      requireActor: vi.fn(),
    } as any;

    requestContext = {
      requireContext: vi.fn(() => ({
        request_id: "req-notification-123",
        ip: "127.0.0.1",
        actor: {
          user_id: 99,
          audience: "staff",
          permissions: ["notifications:read"],
        },
      })),
    } as any;

    service = new NotificationsService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("listTemplates", () => {
    it("员工查看通知模板列表", async () => {
      const templates = {
        items: [
          {
            id: 1,
            key: "account_email_verification",
            name: "邮箱验证",
            channel: "email",
          },
          {
            id: 2,
            key: "order_shipped",
            name: "订单已发货",
            channel: "email",
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:read"],
      });

      stateStore.listNotificationTemplates.mockReturnValue(templates);

      const result = await service.listTemplates();

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "notifications:read",
      );
      expect(stateStore.listNotificationTemplates).toHaveBeenCalled();

      expect(result).toMatchObject(templates);
    });
  });

  describe("upsertTemplate", () => {
    it("创建新通知模板", async () => {
      const newTemplate = {
        id: 3,
        key: "password_reset",
        name: "密码重置",
        channel: "email",
        subject: "重置您的密码",
        body: "请点击以下链接重置密码",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:write"],
      });

      stateStore.upsertNotificationTemplate.mockReturnValue(newTemplate);

      const result = await service.upsertTemplate(undefined, {
        key: "password_reset",
        name: "密码重置",
        channel: "email",
        subject: "重置您的密码",
        body: "请点击以下链接重置密码",
      });

      expect(stateStore.upsertNotificationTemplate).toHaveBeenCalledWith({
        key: "password_reset",
        name: "密码重置",
        channel: "email",
        subject: "重置您的密码",
        body: "请点击以下链接重置密码",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "notifications.template.upsert",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-notification-123",
        item: newTemplate,
      });
    });

    it("更新现有通知模板", async () => {
      const updatedTemplate = {
        id: 1,
        key: "account_email_verification",
        name: "邮箱验证（已更新）",
        channel: "email",
        subject: "新主题",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:write"],
      });

      stateStore.getNotificationTemplateById.mockReturnValue({
        id: 1,
        key: "account_email_verification",
        name: "邮箱验证",
        channel: "email",
      });

      stateStore.upsertNotificationTemplate.mockReturnValue(updatedTemplate);

      const result = await service.upsertTemplate(1, {
        name: "邮箱验证（已更新）",
        subject: "新主题",
      });

      expect(stateStore.upsertNotificationTemplate).toHaveBeenCalledWith({
        id: 1,
        key: "account_email_verification",
        name: "邮箱验证（已更新）",
        subject: "新主题",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "notifications.template.upsert",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-notification-123",
        item: updatedTemplate,
      });
    });
  });

  describe("listDeliveries", () => {
    it("员工查看通知发送记录", async () => {
      const deliveries = {
        items: [
          {
            id: 1,
            recipient_user_id: 1,
            kind: "order.shipped",
            channel: "email",
            status: "sent",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:read"],
      });

      stateStore.listNotificationDeliveries.mockReturnValue(deliveries);

      const result = await service.listDeliveries({
        page: 1,
        page_size: 20,
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "notifications:read",
      );
      expect(stateStore.listNotificationDeliveries).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(deliveries);
    });
  });

  describe("createDelivery", () => {
    it("创建通知发送记录", async () => {
      const delivery = {
        id: 1,
        recipient_user_id: 1,
        kind: "order.shipped",
        channel: "email",
        status: "queued",
        request_id: "req-notification-123",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:write"],
      });

      stateStore.recordNotificationDelivery.mockReturnValue(delivery);

      const result = await service.createDelivery({
        recipient_user_id: 1,
        kind: "order.shipped",
        channel: "email",
        template_key: "order_shipped",
        payload: { order_id: 1 },
      });

      expect(stateStore.recordNotificationDelivery).toHaveBeenCalledWith({
        recipient_user_id: 1,
        kind: "order.shipped",
        channel: "email",
        template_key: "order_shipped",
        payload: { order_id: 1 },
        request_id: "req-notification-123",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "notifications.delivery.create",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-notification-123",
        item: delivery,
      });
    });
  });

  describe("retryDelivery", () => {
    it("重试失败的通知发送", async () => {
      const before = {
        id: 1,
        status: "failed",
        retry_count: 1,
      };

      const after = {
        id: 1,
        status: "queued",
        retry_count: 2,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["notifications:write"],
      });

      stateStore.retryNotificationDelivery.mockReturnValue(after);

      const result = await service.retryDelivery(1, {
        reason: "重试发送",
      });

      expect(stateStore.retryNotificationDelivery).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          reason: "重试发送",
        }),
        "req-notification-123",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "notifications.delivery.retry",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-notification-123",
        item: after,
      });
    });
  });
});
