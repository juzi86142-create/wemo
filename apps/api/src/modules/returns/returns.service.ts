import { Inject, Injectable } from "@nestjs/common";
import {
  ReturnCreateSchema,
  ReturnListQuerySchema,
  ReturnListResponseSchema,
  ReturnMutationResponseSchema,
  ReturnReviewSchema,
} from "@wemo/contracts/commerce";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ReturnsPrismaRepository } from "./returns.prisma-repository";
import { RETURNS_REPOSITORY } from "./returns.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ReturnIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(RETURNS_REPOSITORY)
    private readonly repository: ReturnsPrismaRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async listReturns(query: unknown) {
    const parsed = parseInput(ReturnListQuerySchema, query);
    const actor = this.requestContext.getActor();
    const scope = {
      ...parsed,
      ...(actor && actor.audience === "dealer" && actor.company_id
        ? { company_id: actor.company_id }
        : {}),
      ...(actor && actor.audience !== "staff" && actor.audience !== "dealer"
        ? { user_id: actor.user_id }
        : {}),
    };
    return ReturnListResponseSchema.parse(
      await this.repository.listReturns(scope),
    );
  }

  async createReturn(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(ReturnCreateSchema, body);
    const actor = context.actor;
    const item = await this.repository.createReturn({
      ...input,
      user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      company_id: actor?.company_id ?? null,
      request_id: context.request_id,
    });

    await this.notifications.emitBusinessNotification({
      template_code: "return_requested",
      recipient_user_id: item.user_id,
      company_id: item.company_id,
      audience: item.company_id ? "dealer" : "user",
      channel: "email",
      request_id: context.request_id,
      payload: { return_id: item.id, status: item.status },
    });

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async reviewReturn(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    this.authorization.requireStaffPermission("returns:write");
    const parsedId = parseInput(ReturnIdParamSchema, { id });
    const input = parseInput(ReturnReviewSchema, body);
    const item = await this.repository.reviewReturn(
      parsedId.id,
      context.request_id,
      input.decision,
      input.note,
    );

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
