import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationDeliveryCreateSchema,
  NotificationDeliveryListQuerySchema,
  NotificationDeliveryListResponseSchema,
  NotificationDeliveryMutationResponseSchema,
  NotificationDeliveryRetrySchema,
  NotificationTemplateCreateSchema,
  NotificationTemplateListResponseSchema,
  NotificationTemplateMutationResponseSchema,
  NotificationTemplateUpdateSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema, type JsonValue } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { EmailSenderService } from "./email-sender.service";
import { NotificationsRedisRepository } from "./notifications.redis-repository";
import { NOTIFICATIONS_REPOSITORY } from "./notifications.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const NotificationTemplateIdParamSchema = z.object({
  id: EntityIdSchema,
});
const NotificationDeliveryIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: NotificationsRedisRepository,
    @Inject(EmailSenderService)
    private readonly emailSender: EmailSenderService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listTemplates() {
    this.authorization.requireStaffPermission("notifications:read");
    return NotificationTemplateListResponseSchema.parse(
      await this.repository.listTemplates({ page: 1, page_size: 20 }),
    );
  }

  async upsertTemplate(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    // 新建按必填契约校验 更新按可选契约校验 两种读取来源各自明确
    const input =
      id === undefined
        ? parseInput(NotificationTemplateCreateSchema, body)
        : {
            ...parseInput(NotificationTemplateUpdateSchema, body),
            id: parseInput(NotificationTemplateIdParamSchema, { id }).id,
          };
    const item = await this.repository.upsertTemplate(input);

    return NotificationTemplateMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(NotificationDeliveryListQuerySchema, query);
    return NotificationDeliveryListResponseSchema.parse(
      await this.repository.listDeliveries(parsed),
    );
  }

  async createDelivery(body: unknown) {
    this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(NotificationDeliveryCreateSchema, body);
    const item = await this.repository.recordDelivery({
      ...input,
      request_id: input.request_id ?? context.request_id,
    });

    return NotificationDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async retryDelivery(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(NotificationDeliveryIdParamSchema, { id });
    const input = parseInput(NotificationDeliveryRetrySchema, body);
    const item = await this.repository.retryDelivery(parsedId.id, input.reason);

    return NotificationDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** 业务事件通知 供各业务服务在订单/报价/申请等状态变化时调用 无鉴权属服务端内部能力 */
  async emitBusinessNotification(input: {
    template_code: string;
    recipient_user_id: number | null;
    company_id: number | null;
    audience: "user" | "dealer" | "staff";
    channel: string;
    request_id: string;
    payload: unknown;
  }) {
    const item = await this.repository.recordDelivery({
      ...input,
      payload: input.payload as JsonValue,
      request_id: input.request_id,
    });

    // 模板存在性校验 需求 19.2 模板变量缺失时不发送并记录错误
    const templates = await this.repository.listTemplates({
      page: 1,
      page_size: 200,
    });
    const template = templates.items.find(
      (entry) => entry.code === input.template_code,
    );
    if (!template) {
      await this.repository.updateDeliveryResult(item.id, {
        status: "failed",
        provider_message_id: null,
        failure_reason: `模板 ${input.template_code} 不存在`,
      });
      return (await this.repository.getNotificationDeliveryById(item.id)) ?? item;
    }
    const payloadRecord = (input.payload ?? {}) as Record<string, unknown>;
    const missingVariables = (template.variables ?? []).filter(
      (variable) => payloadRecord[variable] === undefined,
    );
    if (missingVariables.length > 0) {
      await this.repository.updateDeliveryResult(item.id, {
        status: "failed",
        provider_message_id: null,
        failure_reason: `模板变量缺失: ${missingVariables.join(", ")}`,
      });
      return (await this.repository.getNotificationDeliveryById(item.id)) ?? item;
    }

    // 邮件渠道真实投递 本地经 Mailpit SMTP 需求 19.2 发送状态可追踪
    if (input.channel === "email") {
      const email = await this.emailSender.lookupEmail(input.recipient_user_id);
      if (email !== null) {
        const result = await this.emailSender.send(
          email,
          template.subject ?? `WEMOVE 通知 ${input.template_code}`,
          JSON.stringify(input.payload, null, 2),
        );
        await this.repository.updateDeliveryResult(item.id, {
          status: result.sent ? "sent" : "failed",
          provider_message_id: result.provider_message_id,
          failure_reason: result.failure_reason,
        });
      }
      // 内部收件组 需求 19.2 按模板类别投递到后台配置的收件组
      const group = await this.emailSender.lookupNotificationGroup(
        input.template_code,
      );
      for (const groupEmail of group) {
        const result = await this.emailSender.send(
          groupEmail,
          template.subject ?? `WEMOVE 通知 ${input.template_code}`,
          JSON.stringify(input.payload, null, 2),
        );
        if (!result.sent) {
          await this.repository.updateDeliveryResult(item.id, {
            status: "failed",
            provider_message_id: result.provider_message_id,
            failure_reason: result.failure_reason,
          });
        }
      }
      return (await this.repository.getNotificationDeliveryById(item.id)) ?? item;
    }

    return item;
  }
}
