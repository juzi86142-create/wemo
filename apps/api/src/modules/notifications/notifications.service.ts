import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationDeliveryCreateSchema,
  NotificationDeliveryListQuerySchema,
  NotificationDeliveryListResponseSchema,
  NotificationDeliveryMutationResponseSchema,
  NotificationDeliveryRetrySchema,
  NotificationTemplateListResponseSchema,
  NotificationTemplateMutationResponseSchema,
  NotificationTemplateUpdateSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsPrismaRepository } from "./notifications.prisma-repository";
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
    private readonly repository: NotificationsPrismaRepository,
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
    const input = parseInput(NotificationTemplateUpdateSchema, body);
    const payload =
      id === undefined
        ? input
        : { ...(input as any), id: parseInput(NotificationTemplateIdParamSchema, { id }).id };
    const item = await this.repository.upsertTemplate(payload as any);

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
}
