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
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceStateStore)
    private readonly stateStore: ExperienceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listTemplates() {
    this.authorization.requireStaffPermission("notifications:read");
    return NotificationTemplateListResponseSchema.parse(
      this.stateStore.listNotificationTemplates(),
    );
  }

  upsertTemplate(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(NotificationTemplateUpdateSchema, body);
    const payload =
      id === undefined
        ? input
        : { ...(input as any), id: parseInput(NotificationTemplateIdParamSchema, { id }).id };
    const before =
      id === undefined
        ? null
        : this.stateStore.getNotificationTemplateById(
            parseInput(NotificationTemplateIdParamSchema, { id }).id,
          );
    const item = this.stateStore.upsertNotificationTemplate(payload as never);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "notifications.template.upsert",
      entity: "notification_template",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return NotificationTemplateMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(NotificationDeliveryListQuerySchema, query);
    return NotificationDeliveryListResponseSchema.parse(
      this.stateStore.listNotificationDeliveries(parsed),
    );
  }

  createDelivery(body: unknown) {
    const actor = this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(NotificationDeliveryCreateSchema, body);
    const item = this.stateStore.recordNotificationDelivery(input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "notifications.delivery.create",
      entity: "notification_delivery",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return NotificationDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  retryDelivery(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(NotificationDeliveryIdParamSchema, { id });
    const input = parseInput(NotificationDeliveryRetrySchema, body);
    const before = this.stateStore.getNotificationDeliveryById(parsedId.id);
    const item = this.stateStore.retryNotificationDelivery(
      parsedId.id,
      context.request_id,
      input.reason,
    );

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "notifications.delivery.retry",
      entity: "notification_delivery",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return NotificationDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
