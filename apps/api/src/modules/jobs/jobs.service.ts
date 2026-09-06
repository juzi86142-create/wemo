import { Inject, Injectable } from "@nestjs/common";
import {
  EntityIdSchema,
  JsonValueSchema,
} from "@wemo/contracts/common";
import {
  JobCreateSchema,
  JobListQuerySchema,
  JobListResponseSchema,
  JobMutationResponseSchema,
  JobRetrySchema,
  OutboxEventListResponseSchema,
  OutboxEventQuerySchema,
} from "@wemo/contracts/platform";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { parseInput } from "../../runtime/validation";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";

const JobIdParamSchema = z.object({
  id: EntityIdSchema,
});

const JobCompletionSchema = z.object({
  result: JsonValueSchema,
});

const JobFailureSchema = z.object({
  reason: z.string().min(1),
  last_error: JsonValueSchema.optional(),
});

@Injectable()
export class JobsService {
  constructor(
    @Inject(PlatformStateStore)
    private readonly stateStore: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listJobs(query: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(JobListQuerySchema, query);
    return JobListResponseSchema.parse(this.stateStore.listJobs(parsed));
  }

  listOutbox(query: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(OutboxEventQuerySchema, query);
    return OutboxEventListResponseSchema.parse(
      this.stateStore.listOutboxEvents(parsed),
    );
  }

  getJob(id: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(JobIdParamSchema, { id });
    const job = this.stateStore.getJob(parsed.id);
    return JobMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: job,
    });
  }

  createJob(body: unknown) {
    this.authorization.requireStaffPermission("jobs:write");
    const parsed = parseInput(JobCreateSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.stateStore.createJobRun({
      kind: parsed.kind,
      payload: parsed.payload,
      idempotency_key: parsed.idempotency_key,
      max_attempts: parsed.max_attempts,
      request_id: context.request_id,
      actor_id: context.actor?.user_id ?? null,
      company_id: context.actor?.company_id ?? null,
    });

    return JobMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  retryJob(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("jobs:write");
    const parsedId = parseInput(JobIdParamSchema, { id });
    const parsedBody = parseInput(JobRetrySchema, body);
    const context = this.requestContext.requireContext();
    const item = this.stateStore.retryJob(
      parsedId.id,
      context.request_id,
      context.actor?.user_id ?? 1,
      parsedBody.reason,
    );

    return JobMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  completeJob(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("jobs:write");
    const parsedId = parseInput(JobIdParamSchema, { id });
    const parsedBody = parseInput(JobCompletionSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.stateStore.completeJob(
      parsedId.id,
      context.request_id,
      context.actor?.user_id ?? 1,
      parsedBody.result,
    );

    return JobMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  failJob(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("jobs:write");
    const parsedId = parseInput(JobIdParamSchema, { id });
    const parsedBody = parseInput(JobFailureSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.stateStore.failJob(
      parsedId.id,
      context.request_id,
      context.actor?.user_id ?? 1,
      parsedBody.reason,
      parsedBody.last_error,
    );

    return JobMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
