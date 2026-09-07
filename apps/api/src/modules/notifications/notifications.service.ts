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
import { ExperienceRepository } from "../../runtime/experience.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
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
    @Inject(ExperienceRepository)
    private readonly stateStore: ExperienceRepository,
    @Inject(PlatformRepository)
    private readonly platformState: PlatformRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listTemplates() {
    this.authorization.requireStaffPermission("notifications:read");
    return NotificationTemplateListResponseSchema.parse(
      await this.stateStore.listNotificationTemplates(),
    );
  }

  async upsertTemplate(id: unknown, body: unknown) {
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
        : await this.stateStore.getNotificationTemplateById(
            parseInput(NotificationTemplateIdParamSchema, { id }).id,
          );
    const item = await this.stateStore.upsertNotificationTemplate(payload as never);

    await this.platformState.recordAudit({
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

  async listDeliveries(query: unknown) {
    this.authorization.requireStaffPermission("notifications:read");
    const parsed = parseInput(NotificationDeliveryListQuerySchema, query);
    return NotificationDeliveryListResponseSchema.parse(
      await this.stateStore.listNotificationDeliveries(parsed),
    );
  }

  async createDelivery(body: unknown) {
    const actor = this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(NotificationDeliveryCreateSchema, body);
    const item = await this.stateStore.recordNotificationDelivery({
      ...input,
      request_id: input.request_id ?? context.request_id,
    });

    await this.platformState.recordAudit({
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

  async retryDelivery(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("notifications:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(NotificationDeliveryIdParamSchema, { id });
    const input = parseInput(NotificationDeliveryRetrySchema, body);
    const before = await this.stateStore.getNotificationDeliveryById(parsedId.id);
    const item = await this.stateStore.retryNotificationDelivery(
      parsedId.id,
      context.request_id,
      input.reason,
    );

    await this.platformState.recordAudit({
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

