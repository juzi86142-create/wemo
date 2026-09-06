import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
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
import { CommerceStateStore } from "../../runtime/commerce.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const ReturnIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class ReturnsService {
  constructor(
    @Inject(CommerceStateStore)
    private readonly stateStore: CommerceStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listReturns(query: unknown) {
    const parsed = parseInput(ReturnListQuerySchema, query);
    const actor = this.requestContext.getActor();
    const scope =
      actor?.audience === "staff"
        ? parsed
        : actor?.audience === "dealer"
          ? { ...parsed, company_id: actor.company_id ?? undefined }
          : actor
            ? { ...parsed, user_id: actor.user_id }
            : parsed;
    return ReturnListResponseSchema.parse(this.stateStore.listReturnRequests(scope));
  }

  createReturn(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(ReturnCreateSchema, body);
    const order = this.stateStore.getOrderById(input.order_id);
    const actor = context.actor;
    if (
      actor &&
      actor.audience !== "staff" &&
      order.user_id !== actor.user_id &&
      order.company_id !== actor.company_id
    ) {
      throw new ForbiddenException("不能为其他订单创建售后");
    }

    const item = this.stateStore.createReturnRequest({
      ...input,
      user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      company_id: actor?.company_id ?? null,
      request_id: context.request_id,
    });

    this.platformState.recordAudit({
      actor_id: actor?.user_id ?? 1,
      action: "returns.create",
      entity: "return_request",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  reviewReturn(id: unknown, body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.authorization.requireStaffPermission("returns:write");
    const parsedId = parseInput(ReturnIdParamSchema, { id });
    const input = parseInput(ReturnReviewSchema, body);
    const before = this.stateStore.getReturnRequestById(parsedId.id);
    const item = this.stateStore.reviewReturnRequest(
      parsedId.id,
      context.request_id,
      input.decision,
      input.note,
    );

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "returns.review",
      entity: "return_request",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return ReturnMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
