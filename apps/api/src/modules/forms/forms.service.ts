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
import { FormsPrismaRepository } from "./forms.prisma-repository";
import { FORMS_REPOSITORY } from "./forms.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

const FormSubmissionIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class FormsService {
  constructor(
    @Inject(FORMS_REPOSITORY)
    private readonly repository: FormsPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  submit(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(FormSubmissionCreateSchema, body);
    const item = this.repository.submitForm({
      ...input,
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
      this.repository.listSubmissions(parsed),
    );
  }

  updateSubmission(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("forms:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(FormSubmissionIdParamSchema, { id });
    const input = parseInput(FormSubmissionUpdateSchema, body);
    const item = this.repository.updateSubmission(parsedId.id, input);

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
