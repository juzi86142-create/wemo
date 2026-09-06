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
} from "@wemo/contracts/dealers";
import { EntityIdSchema } from "@wemo/contracts/common";
import { z } from "zod";

import { AuthorizationService } from "../../runtime/authorization.service";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { DEALERS_REPOSITORY, type DealersRepository } from "./dealers.repository";

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
    private readonly repository: DealersRepository,
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

  async inviteMember(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const companyId = this.requireDealerCompanyId();
    const input = parseInput(DealerMemberCreateSchema, body);
    const item = await this.repository.createDealerMember({
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
}
