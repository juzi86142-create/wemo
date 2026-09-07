import { Inject, Injectable } from "@nestjs/common";
import {
  FormSubmissionCreateSchema,
  FormSubmissionListQuerySchema,
  FormSubmissionListResponseSchema,
  FormSubmissionMutationResponseSchema,
  FormSubmissionUpdateSchema,
} from "@wemo/contracts/content";
import { EntityIdSchema } from "@wemo/contracts/common";
import { PaginationSchema } from "@wemo/contracts/common";
import { z } from "zod";

const FormDefinitionIdSchema = z.object({
  id: EntityIdSchema,
});

const FormDefinitionListSchema = PaginationSchema;

const FormDefinitionCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    fields: z.array(z.unknown()).default([]),
    is_active: z.boolean().optional(),
  })
  .strict();

const FormDefinitionUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    fields: z.array(z.unknown()).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from "../analytics/analytics.repository";
import { AUDIT_REPOSITORY, type AuditRepository } from "../audit/audit.repository";
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
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: AnalyticsRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  /** 联系类型表单定义管理 需求 CT-001 后台可配置 */
  async listFormDefinitions(query: unknown) {
    this.authorization.requireStaffPermission("forms:read");
    const parsed = parseInput(FormDefinitionListSchema, query);
    return {
      ...(await this.repository.listForms({
        page: parsed.page,
        page_size: parsed.page_size,
      })),
    };
  }

  async createFormDefinition(body: unknown) {
    this.authorization.requireStaffPermission("forms:write");
    const input = parseInput(FormDefinitionCreateSchema, body);
    const item = await this.repository.createForm(input);
    return {
      request_id: this.requestContext.requireContext().request_id,
      item,
    };
  }

  async updateFormDefinition(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("forms:write");
    const parsedId = parseInput(FormDefinitionIdSchema, { id });
    const input = parseInput(FormDefinitionUpdateSchema, body);
    const item = await this.repository.updateForm(parsedId.id, input);
    return {
      request_id: this.requestContext.requireContext().request_id,
      item,
    };
  }

  async submit(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(FormSubmissionCreateSchema, body);
    const item = await this.repository.submitForm(input);

    const actor = this.requestContext.getActor();
    await this.analyticsRepository.recordEvents(
      [
        {
          name: "contact_submit",
          payload: {
            submission_no: item.submission_no,
            type: item.type,
            source: item.source,
          },
          market: context.market,
          locale: context.locale,
          role: actor?.audience ?? "user",
          dedupe_key: `contact_submit:${context.request_id}`,
        },
      ],
      context,
    );

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
    const actor = this.authorization.requireStaffPermission("forms:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(FormSubmissionIdParamSchema, { id });
    const input = parseInput(FormSubmissionUpdateSchema, body);
    const item = await this.repository.updateSubmission(parsedId.id, input);
    await this.auditRepository.recordLog({
      actor_id: actor.user_id,
      action: "forms.update_submission",
      entity: "form_submission",
      entity_id: parsedId.id,
      after: input as unknown as import("@wemo/contracts/common").JsonValue,
      request_id: context.request_id,
    });

    return FormSubmissionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
