import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DealerAddressCreateSchema,
  DealerAddressListResponseSchema,
  DealerAddressMutationResponseSchema,
  DealerApplicationCreateSchema,
  DealerApplicationListQuerySchema,
  DealerApplicationListResponseSchema,
  DealerApplicationMutationResponseSchema,
  DealerApplicationReviewResultSchema,
  DealerApplicationReviewSchema,
  DealerApplicationSubmitSchema,
  DealerCompanyListQuerySchema,
  DealerCompanyListResponseSchema,
  DealerCompanyMutationResponseSchema,
  DealerCompanyUpdateSchema,
  DealerMemberCreateSchema,
  DealerMemberListQuerySchema,
  DealerMemberListResponseSchema,
  DealerMemberMutationResponseSchema,
  DealerPublicListingListQuerySchema,
  DealerPublicListingListResponseSchema,
  DealerMemberAcceptSchema,
  DealerMemberInviteSchema,
  DealerMemberInviteResponseSchema,
  DealerTierListResponseSchema,
  DealerTierMutationResponseSchema,
  DealerTierUpsertSchema,
} from "@wemo/contracts/dealers";
import { randomBytes } from "node:crypto";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { ANALYTICS_REPOSITORY, type AnalyticsRepository } from "../analytics/analytics.repository";
import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsService } from "../notifications/notifications.service";
import { listResponse } from "../../runtime/list-response";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { DEALERS_REPOSITORY, type DealersRepository } from "./dealers.repository";

const ApplicationIdParamSchema = z.object({
  id: EntityIdSchema,
});

const CompanyIdParamSchema = z.object({
  id: EntityIdSchema,
});

@Injectable()
export class DealersService {
  constructor(
    @Inject(DEALERS_REPOSITORY)
    private readonly repository: DealersRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(ANALYTICS_REPOSITORY)
    private readonly analyticsRepository: AnalyticsRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  private requireDealerCompanyId(): number {
    const actor = this.authorization.requireActor();
    return actor.company_id ?? 0;
  }

  async listPublicListings(query: unknown) {
    const parsed = parseInput(DealerPublicListingListQuerySchema, query);
    return DealerPublicListingListResponseSchema.parse(
      await this.repository.listPublicListings(parsed),
    );
  }

  async createApplication(body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.requestContext.getActor();
    const input = parseInput(DealerApplicationCreateSchema, body);
    const item = await this.repository.createApplication({
      ...input,
      applicant_user_id:
        actor?.audience === "staff" ? null : actor?.user_id ?? null,
      request_id: context.request_id,
    });

    return DealerApplicationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listApplications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(DealerApplicationListQuerySchema, query);
    const result =
      actor.audience === "staff"
        ? this.repository.listDealerApplications(parsed)
        : this.repository.listDealerApplications({
            ...parsed,
            applicant_user_id: actor.user_id,
          });

    return DealerApplicationListResponseSchema.parse(await result);
  }

  async listAdminApplications(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerApplicationListQuerySchema, query);
    return DealerApplicationListResponseSchema.parse(
      await this.repository.listDealerApplications(parsed),
    );
  }

  async getApplication(id: unknown) {
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const item = await this.repository.getDealerApplication(parsedId.id);
    if (!item) {
      throw new NotFoundException("经销商申请不存在");
    }
    if (actor.audience !== "staff" && item.applicant_user_id !== actor.user_id) {
      throw new ForbiddenException("不能查看其他申请");
    }

    return DealerApplicationMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  async submitApplication(id: unknown, body: unknown) {
    const actor = this.requestContext.getActor();
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const input = parseInput(DealerApplicationSubmitSchema, body);
    const existing = await this.repository.getDealerApplication(parsedId.id);
    if (!existing) {
      throw new NotFoundException("经销商申请不存在");
    }
    if (
      actor &&
      actor.audience !== "staff" &&
      existing.applicant_user_id !== null &&
      existing.applicant_user_id !== actor.user_id
    ) {
      throw new ForbiddenException("不能提交其他申请");
    }

    const item = await this.repository.submitDealerApplication(
      parsedId.id,
      context.request_id,
      actor?.user_id ?? null,
      input.note,
    );

    await this.analyticsRepository.recordEvents(
      [
        {
          name: "dealer_apply_submit",
          payload: {
            application_id: item.id,
            application_no: item.application_no,
          },
          market: context.market,
          locale: context.locale,
          role: actor?.audience ?? "dealer",
          dedupe_key: `dealer_apply_submit:${context.request_id}`,
        },
      ],
      context,
    );

    await this.notifications.emitBusinessNotification({
      template_code: "dealer_application_submitted",
      recipient_user_id: actor?.user_id ?? null,
      company_id: null,
      audience: actor?.audience === "staff" ? "staff" : "dealer",
      channel: "email",
      request_id: context.request_id,
      payload: { application_id: item.id, application_no: item.application_no },
    });

    return DealerApplicationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async reviewApplication(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("dealers:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const input = parseInput(DealerApplicationReviewSchema, body);
    const result = await this.repository.reviewDealerApplication(
      parsedId.id,
      input,
      actor.user_id,
      context.request_id,
    );

    await this.notifications.emitBusinessNotification({
      template_code: "dealer_application_reviewed",
      recipient_user_id: result.application.applicant_user_id,
      company_id: result.company?.id ?? null,
      audience: "dealer",
      channel: "email",
      request_id: context.request_id,
      payload: {
        application_id: result.application.id,
        application_no: result.application.application_no,
        status: result.application.status,
      },
    });

    return DealerApplicationReviewResultSchema.parse({
      request_id: context.request_id,
      item: result,
    });
  }

  async getCompany() {
    const companyId = this.requireDealerCompanyId();
    const item = await this.repository.getDealerCompany(companyId);
    if (!item) {
      throw new NotFoundException("经销商企业不存在");
    }
    return DealerCompanyMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  async updateCompany(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerCompanyUpdateSchema, body);
    if (actor.audience !== "staff" && input.status !== undefined) {
      throw new ForbiddenException("企业成员不能修改企业状态");
    }

    const item = await this.repository.updateDealerCompany(companyId, input);

    return DealerCompanyMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async updateCompanyById(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("dealers:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CompanyIdParamSchema, { id });
    const input = parseInput(DealerCompanyUpdateSchema, body);
    const item = await this.repository.updateDealerCompany(parsedId.id, input);

    return DealerCompanyMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listAddresses() {
    const companyId = this.requireDealerCompanyId();
    const addresses = await this.repository.listDealerAddresses(companyId);
    return DealerAddressListResponseSchema.parse(listResponse(addresses));
  }

  async createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerAddressCreateSchema, body);
    const item = await this.repository.createDealerAddress(companyId, input);

    return DealerAddressMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listMembers(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(DealerMemberListQuerySchema, query);
    const companyId =
      actor.audience === "staff"
        ? parsed.company_id
        : this.requireDealerCompanyId();
    if (
      actor.audience !== "staff" &&
      parsed.company_id !== undefined &&
      parsed.company_id !== companyId
    ) {
      throw new ForbiddenException("不能查看其他企业成员");
    }

    return DealerMemberListResponseSchema.parse(
      await this.repository.listDealerMembers({
        company_id: companyId,
        status: parsed.status,
        page: parsed.page,
        page_size: parsed.page_size,
      }),
    );
  }

  async listCompanies(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerCompanyListQuerySchema, query);
    return DealerCompanyListResponseSchema.parse(
      await this.repository.listDealerCompanies(parsed),
    );
  }

  async listAdminMembers(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerMemberListQuerySchema, query);
    return DealerMemberListResponseSchema.parse(
      await this.repository.listDealerMembers(parsed),
    );
  }

  /** 成员邀请 需求 6.7 一次性令牌带有效期 接受后建立成员关系 */
  async inviteMember(body: unknown) {
    const actor = this.authorization.requireAudience("dealer", "staff");
    const context = this.requestContext.requireContext();
    const input = parseInput(DealerMemberInviteSchema, body);
    const companyId =
      actor.audience === "staff"
        ? this.requireDealerCompanyId()
        : actor.company_id;
    if (!companyId) {
      throw new ForbiddenException("邀请需要企业上下文");
    }
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await this.repository.createMemberInvite(
      companyId,
      input.email,
      input.role ?? "member",
      token,
      expiresAt,
    );

    await this.notifications.emitBusinessNotification({
      template_code: "dealer_member_invite",
      recipient_user_id: actor.user_id,
      company_id: companyId,
      audience: "dealer",
      channel: "email",
      request_id: context.request_id,
      payload: { email: input.email, token, expires_at: expiresAt },
    });

    return DealerMemberInviteResponseSchema.parse({
      request_id: context.request_id,
      item: { token, email: input.email, expires_at: expiresAt },
    });
  }

  async acceptMemberInvite(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(DealerMemberAcceptSchema, body);
    const invite = await this.repository.acceptMemberInvite(input.token);
    if (!invite) {
      throw new NotFoundException("邀请链接无效或已过期");
    }
    const existing = await this.repository.listDealerMembers({
      company_id: invite.company_id,
      page: 1,
      page_size: 100,
    });
    const already = existing.items.find(
      (member) => member.user_id === actor.user_id,
    );
    if (already) {
      return DealerMemberMutationResponseSchema.parse({
        request_id: context.request_id,
        item: already,
      });
    }
    const item = await this.repository.createDealerMember({
      company_id: invite.company_id,
      user_id: actor.user_id,
      role: invite.role,
      permissions: ["dealer:read", "dealer:write"],
    });

    return DealerMemberMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  /** 经销商等级主数据 需求 6.4 名称后台可配置 */
  async listTiers() {
    this.authorization.requireStaffPermission("dealers:read");
    return DealerTierListResponseSchema.parse(
      listResponse(await this.repository.listTiers()),
    );
  }

  async upsertTier(id: unknown, body: unknown) {
    this.authorization.requireStaffPermission("dealers:write");
    const context = this.requestContext.requireContext();
    const input = parseInput(DealerTierUpsertSchema, body);
    const payload =
      id === undefined
        ? input
        : { ...input, id: parseInput(CompanyIdParamSchema, { id }).id };
    const item = await this.repository.upsertTier(payload);

    return DealerTierMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
