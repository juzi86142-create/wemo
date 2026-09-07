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
import { NotificationsService } from "../notifications/notifications.service";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { FORMS_REPOSITORY, type FormsRepository } from "./forms.repository";

const FormSubmissionIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class FormsService {
  constructor(
    @Inject(FORMS_REPOSITORY)
    private readonly repository: FormsRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async submit(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(FormSubmissionCreateSchema, body);
    const item = await this.repository.submitForm(input);

    const actor = this.requestContext.getActor();
    await this.notifications.emitBusinessNotification({
      template_code: "contact_submission",
      recipient_user_id: actor?.user_id ?? null,
      company_id: actor?.company_id ?? null,
      audience: actor?.audience ?? "user",
      channel: "email",
      request_id: context.request_id,
      payload: {
        submission_no: item.submission_no,
        type: item.type,
        source: item.source,
      },
    });

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listSubmissions(query: unknown) {
    this.authorization.requireStaffPermission("forms:read");
    const parsed = parseInput(FormSubmissionListQuerySchema, query);
    const result = await this.repository.listSubmissions(parsed);
    return FormSubmissionListResponseSchema.parse(result);
  }

  async updateSubmission(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("forms:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(FormSubmissionIdParamSchema, { id });
    const input = parseInput(FormSubmissionUpdateSchema, body);
    const item = await this.repository.updateSubmission(parsedId.id, input);

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
