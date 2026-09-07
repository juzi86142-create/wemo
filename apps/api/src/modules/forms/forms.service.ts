import { Inject, Injectable } from "@nestjs/common";
import {
  FormSubmissionCreateSchema,
  FormSubmissionListQuerySchema,
  FormSubmissionListResponseSchema,
  FormSubmissionMutationResponseSchema,
  FormSubmissionUpdateSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { ExperienceRepository } from "../../runtime/experience.state";
import { PlatformRepository } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const FormSubmissionIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class FormsService {
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

  async submit(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(FormSubmissionCreateSchema, body);
    const item = await this.stateStore.createFormSubmission({
      ...input,
      request_id: context.request_id,
    });

    await this.platformState.recordAudit({
      actor_id: context.actor?.user_id ?? 1,
      action: "forms.submission.create",
      entity: "form_submission",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listSubmissions(query: unknown) {
    this.authorization.requireStaffPermission("forms:read");
    const parsed = parseInput(FormSubmissionListQuerySchema, query);
    return FormSubmissionListResponseSchema.parse(
      await this.stateStore.listFormSubmissions(parsed),
    );
  }

  async updateSubmission(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("forms:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(FormSubmissionIdParamSchema, { id });
    const input = parseInput(FormSubmissionUpdateSchema, body);
    const before = await this.stateStore.getFormSubmissionById(parsedId.id);
    const item = await this.stateStore.updateFormSubmission(
      parsedId.id,
      input,
      context.request_id,
      actor.user_id,
    );

    await this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "forms.submission.update",
      entity: "form_submission",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}

