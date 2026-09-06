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
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { DealersPrismaRepository } from "./dealers.prisma-repository";
import { DEALERS_REPOSITORY } from "./dealers.repository";

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
    @Inject(DEALERS_REPOSITORY)
    private readonly repository: DealersPrismaRepository,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  private requireDealerCompanyId(): number {
    const actor = this.authorization.requireActor();
    return actor.company_id ?? 0;
  }

  listPublicListings(query: unknown) {
    const parsed = parseInput(DealerPublicListingListQuerySchema, query);
    return DealerPublicListingListResponseSchema.parse(
      this.repository.listPublicListings(parsed),
    );
  }

  createApplication(body: unknown) {
    const context = this.requestContext.requireContext();
    const actor = this.requestContext.getActor();
    const input = parseInput(DealerApplicationCreateSchema, body);
    const item = this.repository.createApplication({
      ...input,
      applicant_user_id: actor?.audience === "staff" ? null : actor?.user_id ?? null,
      request_id: context.request_id,
      payload: input.payload ?? {},
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
        ? this.repository.listDealerApplications(parsed)
        : this.repository.listDealerApplications({
            ...parsed,
            applicant_user_id: actor.user_id,
          });

    return DealerApplicationListResponseSchema.parse(result);
  }

  listAdminApplications(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerApplicationListQuerySchema, query);
    return DealerApplicationListResponseSchema.parse(
      this.repository.listDealerApplications(parsed),
    );
  }

  getApplication(id: unknown) {
    const actor = this.authorization.requireActor();
    const parsedId = parseInput(ApplicationIdParamSchema, { id });
    const item = this.repository.getDealerApplication(parsedId.id);
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
    const existing = this.repository.getDealerApplication(parsedId.id);
    if (actor && actor.audience !== "staff" && existing.applicant_user_id !== null && existing.applicant_user_id !== actor.user_id) {
      throw new ForbiddenException("不能提交其他申请");
    }

    const item = this.repository.submitDealerApplication(
      parsedId.id,
      context.request_id,
      actor?.user_id ?? null,
      input.note,
    );

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
    const result = this.repository.reviewDealerApplication(
      parsedId.id,
      input,
      actor.user_id,
      context.request_id,
    );

    return DealerApplicationReviewResultSchema.parse({
      request_id: context.request_id,
      item: result,
    });
  }

  getCompany() {
    const companyId = this.requireDealerCompanyId();
    const item = this.repository.getDealerCompany(companyId);
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

    const item = this.repository.updateDealerCompany(companyId, input);

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
    const item = this.repository.updateDealerCompany(parsedId.id, input);

    return DealerCompanyMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listAddresses() {
    const companyId = this.requireDealerCompanyId();
    return DealerAddressListResponseSchema.parse(
      listResponse(this.repository.listDealerAddresses(companyId)),
    );
  }

  createAddress(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerAddressCreateSchema, body);
    const item = this.repository.createDealerAddress(companyId, input);

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
      this.repository.listDealerMembers({
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
    const item = this.repository.createDealerMember({
      company_id: companyId,
      user_id: input.user_id,
      role: input.role,
      permissions: input.permissions,
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
      this.repository.listDealerCompanies(parsed),
    );
  }

  listAdminMembers(query: unknown) {
    this.authorization.requireStaffPermission("dealers:read");
    const parsed = parseInput(DealerMemberListQuerySchema, query);
    return DealerMemberListResponseSchema.parse(
      this.repository.listDealerMembers(parsed),
    );
  }
}
