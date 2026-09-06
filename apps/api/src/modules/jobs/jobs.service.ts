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
import { JobsPrismaRepository } from "./jobs.prisma-repository";
import { JOBS_REPOSITORY } from "./jobs.repository";
import { parseInput } from "../../runtime/validation";
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
    @Inject(JOBS_REPOSITORY)
    private readonly repository: JobsPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  listJobs(query: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(JobListQuerySchema, query);
    return JobListResponseSchema.parse(this.repository.listExecutions(parsed));
  }

  listOutbox(query: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(OutboxEventQuerySchema, query);
    return OutboxEventListResponseSchema.parse(
      [],
    );
  }

  getJob(id: unknown) {
    this.authorization.requireStaffPermission("jobs:read");
    const parsed = parseInput(JobIdParamSchema, { id });
    const job = this.repository.getDefinition(parsed.id);
    return JobMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item: job,
    });
  }

  createJob(body: unknown) {
    this.authorization.requireStaffPermission("jobs:write");
    const parsed = parseInput(JobCreateSchema, body);
    const context = this.requestContext.requireContext();
    const item = this.repository.triggerExecution(parsed.id);

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
    const item = this.repository.updateExecutionStatus(parsedId.id, "running");

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
    const item = this.repository.updateExecutionStatus(parsedId.id, "completed", parsedBody.result);

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
    const item = this.repository.updateExecutionStatus(parsedId.id, "failed", { error: parsedBody.reason });

    return JobMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
