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
import { ExperienceStateStore } from "../../runtime/experience.state";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const FormSubmissionIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class FormsService {
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

  submit(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(FormSubmissionCreateSchema, body);
    const item = this.stateStore.createFormSubmission({
      ...input,
      request_id: context.request_id,
    });

    this.platformState.recordAudit({
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

  listSubmissions(query: unknown) {
    this.authorization.requireStaffPermission("forms:read");
    const parsed = parseInput(FormSubmissionListQuerySchema, query);
    return FormSubmissionListResponseSchema.parse(
      this.stateStore.listFormSubmissions(parsed),
    );
  }

  updateSubmission(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("forms:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(FormSubmissionIdParamSchema, { id });
    const input = parseInput(FormSubmissionUpdateSchema, body);
    const before = this.stateStore.getFormSubmissionById(parsedId.id);
    const item = this.stateStore.updateFormSubmission(
      parsedId.id,
      input,
      context.request_id,
      actor.user_id,
    );

    this.platformState.recordAudit({
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
