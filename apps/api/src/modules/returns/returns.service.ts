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
    return ReturnListResponseSchema.parse(this.repository.listReturns(scope));
  }

  createReturn(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(ReturnCreateSchema, body);
    const actor = context.actor;
    const item = this.repository.createReturn({
      ...input,
      user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      company_id: actor?.company_id ?? null,
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
    const item = this.repository.reviewReturn(
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
