import {
  ForbiddenException,
  Inject,
  Injectable,
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
} from "@wemo/contracts/dealers";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityStateStore } from "../identity/identity.state";

const ApplicationIdParamSchema = z.object({
  id: EntityIdSchema,
});

const CompanyIdParamSchema = z.object({
  id: EntityIdSchema,
});

function listResponse<T>(items: T[]): {
  items: T[];
  page: number;
  page_size: number;
  total: number;
} {
  return {
    items,
    page: 1,
    page_size: Math.max(items.length, 1),
    total: items.length,
  };
}

@Injectable()
export class DealersService {
  constructor(
    @Inject(IdentityStateStore)
    private readonly stateStore: IdentityStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  private requireDealerCompanyId(): number {
    const actor = this.authorization.requireActor();
    const dealerContext = this.stateStore.getDealerContextForUser(actor.user_id);
    if (!dealerContext) {
      throw new ForbiddenException("当前账号没有可用的经销商企业");
    }
    if (actor.company_id && actor.company_id !== dealerContext.company_id) {
      throw new ForbiddenException("会话企业范围已失效");
    }
    return dealerContext.company_id;
  }

  listPublicListings(query: unknown) {
    const parsed = parseInput(DealerPublicListingListQuerySchema, query);
    return DealerPublicListingListResponseSchema.parse(
      this.stateStore.listPublicDealerListings(parsed),
    );
  }

  createApplication(body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.requestContext.getActor();
    const input = parseInput(DealerApplicationCreateSchema, body);
    const item = this.stateStore.createDealerApplication({
      ...input,
      applicant_user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      request_id: context.request_id,
      payload: input.payload ?? {},
    });

    this.platformState.recordAudit({
      actor_id: actor?.user_id ?? 1,
      action: "dealer.application.create",
      entity: "dealer_application",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerApplicationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listApplications(query: unknown) {
    const actor = this.authorization.requireActor();
    const parsed = parseInput(DealerApplicationListQuerySchema, query);
    const result =
      actor.audience === "staff"
        ? this.stateStore.listDealerApplications(parsed)
        : this.stateStore.listDealerApplications({
            ...parsed,
            applicant_user_id: actor.user_id,
          });

    return DealerApplicationListResponseSchema.parse(result);
  }

  listAdminApplications(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerApplicationListQuerySchema, query);
    return DealerApplicationListResponseSchema.parse(
      this.stateStore.listDealerApplications(parsed),
    );
  }

  getApplication(id: unknown) {
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const item = this.stateStore.getDealerApplication(parsedId.id);
    if (actor.audience !== "staff" && item.applicant_user_id !== actor.user_id) {
      throw new ForbiddenException("不能查看其他申请");
    }

    return DealerApplicationMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  submitApplication(id: unknown, body: unknown) {
    const actor = this.requestContext.getActor();
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const input = parseInput(DealerApplicationSubmitSchema, body);
    const existing = this.stateStore.getDealerApplication(parsedId.id);
    if (actor && actor.audience !== "staff" && existing.applicant_user_id !== null && existing.applicant_user_id !== actor.user_id) {
      throw new ForbiddenException("不能提交其他申请");
    }

    const item = this.stateStore.submitDealerApplication(
      parsedId.id,
      context.request_id,
      actor?.user_id ?? null,
      input.note,
    );

    this.platformState.recordAudit({
      actor_id: actor?.user_id ?? 1,
      action: "dealer.application.submit",
      entity: "dealer_application",
      entity_id: item.id,
      before: existing,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerApplicationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  reviewApplication(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("dealers:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const input = parseInput(DealerApplicationReviewSchema, body);
    const before = this.stateStore.getDealerApplication(parsedId.id);
    const result = this.stateStore.reviewDealerApplication(
      parsedId.id,
      input,
      actor.user_id,
      context.request_id,
    );

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "dealer.application.review",
      entity: "dealer_application",
      entity_id: result.application.id,
      before,
      after: result.application,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    if (result.company) {
      this.platformState.recordAudit({
        actor_id: actor.user_id,
        action: "dealer.company.create",
        entity: "dealer_company",
        entity_id: result.company.id,
        before: null,
        after: result.company,
        ip: context.ip ?? null,
        request_id: context.request_id,
      });
    }

    if (result.member) {
      this.platformState.recordAudit({
        actor_id: actor.user_id,
        action: "dealer.member.create",
        entity: "dealer_member",
        entity_id: result.member.id,
        before: null,
        after: result.member,
        ip: context.ip ?? null,
        request_id: context.request_id,
      });
    }

    return DealerApplicationReviewResultSchema.parse({
      request_id: context.request_id,
      item: result,
    });
  }

  getCompany() {
    const companyId = this.requireDealerCompanyId();
    const item = this.stateStore.getDealerCompany(companyId);
    return DealerCompanyMutationResponseSchema.parse({
      request_id: this.requestContext.requireContext().request_id,
      item,
    });
  }

  updateCompany(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerCompanyUpdateSchema, body);
    if (actor.audience !== "staff" && input.status !== undefined) {
      throw new ForbiddenException("企业成员不能修改企业状态");
    }

    const before = this.stateStore.getDealerCompany(companyId);
    const item = this.stateStore.updateDealerCompany(companyId, input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "dealer.company.update",
      entity: "dealer_company",
      entity_id: companyId,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerCompanyMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  updateCompanyById(id: unknown, body: unknown) {
    const actor = this.authorization.requireStaffPermission("dealers:write");
    const context = this.requestContext.requireContext();
    const parsedId = parseInput(CompanyIdParamSchema, { id });
    const input = parseInput(DealerCompanyUpdateSchema, body);
    const before = this.stateStore.getDealerCompany(parsedId.id);
    const item = this.stateStore.updateDealerCompany(parsedId.id, input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "dealer.company.update",
      entity: "dealer_company",
      entity_id: parsedId.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerCompanyMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listAddresses() {
    const companyId = this.requireDealerCompanyId();
    return DealerAddressListResponseSchema.parse(
      listResponse(this.stateStore.listDealerAddresses(companyId)),
    );
  }

  createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerAddressCreateSchema, body);
    const item = this.stateStore.addDealerAddress(companyId, input);

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "dealer.address.create",
      entity: "dealer_address",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerAddressMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listMembers(query: unknown) {
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
      this.stateStore.listDealerMembers({
        company_id: companyId,
        status: parsed.status,
        page: parsed.page,
        page_size: parsed.page_size,
      }),
    );
  }

  inviteMember(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerMemberCreateSchema, body);
    const item = this.stateStore.inviteDealerMember({
      company_id: companyId,
      user_id: input.user_id,
      role: input.role,
      permissions: input.permissions,
    });

    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "dealer.member.invite",
      entity: "dealer_member",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return DealerMemberMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listCompanies(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerCompanyListQuerySchema, query);
    return DealerCompanyListResponseSchema.parse(
      this.stateStore.listDealerCompanies(parsed),
    );
  }

  listAdminMembers(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerMemberListQuerySchema, query);
    return DealerMemberListResponseSchema.parse(
      this.stateStore.listDealerMembers(parsed),
    );
  }
}
