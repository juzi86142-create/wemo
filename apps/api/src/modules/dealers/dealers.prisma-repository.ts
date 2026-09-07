import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type {
  DealerAddress,
  DealerAddressCreateInput,
  DealerApplication,
  DealerApplicationCreateInput,
  DealerApplicationReviewInput,
  DealerApplicationStatus,
  DealerCompany,
  DealerCompanyStatus,
  DealerCompanyUpdateInput,
  DealerMember,
  DealerMemberCreateInput,
  DealerMemberStatus,
  DealerPublicListing,
  DealerTier,
  DealerTierUpsertInput,
  JsonValue,
} from "@wemo/contracts";
import type { DatabaseClient } from "@wemo/database";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { generateBusinessNo } from "../../runtime/ids";
import {
  readHashAll,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";

function companyAddressesKey(companyId: number): string {
  return `${REDIS_KEY_PREFIX}:company:${companyId}:addresses`;
}
import type {
  DealersRepository,
  DealerApplicationListQuery,
  DealerCompanyListQuery,
  DealerMemberListQuery,
  DealerPublicListingListQuery,
  ListResult,
} from "./dealers.repository";

/** 经销商申请企业与成员持久化在 PostgreSQL 企业地址持久化在 Redis */
@Injectable()
export class DealersPrismaRepository implements DealersRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listPublicListings(
    query: DealerPublicListingListQuery,
  ): Promise<ListResult<DealerPublicListing>> {
    const where = {
      status: "active" as const,
      publicListing: true,
      ...(query.country !== undefined ? { country: query.country } : {}),
    };
    const [companies, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerCompany.count({ where }),
    ]);

    return {
      items: companies.map((company) => ({
        company: this.mapCompany(company),
        addresses: [],
      })),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createApplication(
    input: DealerApplicationCreateInput & {
      applicant_user_id: number | null;
      request_id: string;
    },
  ): Promise<DealerApplication> {
    const payload = this.readRecord(input.payload);
    const application = await this.database.dealerApplication.create({
      data: {
        applicationNo: generateBusinessNo("APP"),
        applicantUserId: input.applicant_user_id,
        legalName: input.legal_name,
        country: input.country,
        contactEmail: input.contact_email,
        payload: {
          ...payload,
          display_name: input.display_name,
          website: input.website ?? null,
          business_type: input.business_type,
          tax_id: input.tax_id ?? null,
          contact_name: input.contact_name,
          contact_phone: input.contact_phone ?? null,
          currency: input.currency,
        },
        status: "draft",
      },
    });

    return this.mapApplication(application);
  }

  async listDealerApplications(
    query: DealerApplicationListQuery,
  ): Promise<ListResult<DealerApplication>> {
    const where = {
      ...(query.applicant_user_id !== undefined
        ? { applicantUserId: query.applicant_user_id }
        : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.country !== undefined ? { country: query.country } : {}),
    };
    const [applications, total] = await Promise.all([
      this.database.dealerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerApplication.count({ where }),
    ]);

    return {
      items: applications.map((application) =>
        this.mapApplication(application),
      ),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getDealerApplication(id: number): Promise<DealerApplication | null> {
    const application = await this.database.dealerApplication.findUnique({
      where: { id },
    });

    return application ? this.mapApplication(application) : null;
  }

  async submitDealerApplication(
    id: number,
    requestId: string,
    userId: number | null,
    note?: string,
  ): Promise<DealerApplication> {
    const existing = await this.database.dealerApplication.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("经销商申请不存在");
    }

    const payload = this.readRecord(existing.payload);
    const application = await this.database.dealerApplication.update({
      where: { id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        payload: { ...payload, note: note ?? null },
      },
    });

    return this.mapApplication(application);
  }

  async reviewDealerApplication(
    id: number,
    input: DealerApplicationReviewInput,
    reviewerId: number,
    requestId: string,
  ): Promise<{
    application: DealerApplication;
    company: DealerCompany | null;
    member: DealerMember | null;
  }> {
    return this.database.$transaction(async (tx) => {
      const existing = await tx.dealerApplication.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException("经销商申请不存在");
      }

      const application = await tx.dealerApplication.update({
        where: { id },
        data: {
          status: input.decision,
          reviewedAt: new Date(),
          reviewNote: input.reason ?? null,
        },
      });

      let companyRow: unknown = null;
      let memberRow: unknown = null;
      if (input.decision === "approved") {
        const payload = this.readRecord(existing.payload);
        companyRow = await tx.dealerCompany.create({
          data: {
            legalName: existing.legalName,
            displayName: this.requiredStringFrom(payload, "display_name"),
            country: existing.country,
            currency: this.requiredCurrencyFrom(payload),
            tierId: input.tier_id ?? null,
            priceListId: input.price_list_id ?? null,
            publicListing: input.public_listing ?? false,
            status: "active",
            terms: {
              ...payload,
              // 通过配置直接写入 无兜底默认
              payment_terms: input.payment_terms,
              sales_territories: input.sales_territories,
              authorized_categories: input.authorized_categories ?? [],
              sales_rep: input.sales_rep ?? null,
            },
          },
        });
        if (existing.applicantUserId !== null) {
          memberRow = await tx.dealerMember.create({
            data: {
              companyId: (companyRow as { id: number }).id,
              userId: existing.applicantUserId,
              role: "admin",
              permissions: ["dealer:read", "dealer:write"],
              status: "active",
            },
          });
        }
      }

      return {
        application: this.mapApplication(application),
        company: companyRow ? this.mapCompany(companyRow) : null,
        member: memberRow ? this.mapMember(memberRow) : null,
      };
    });
  }

  async getDealerCompany(companyId: number): Promise<DealerCompany | null> {
    const company = await this.database.dealerCompany.findUnique({
      where: { id: companyId },
    });

    return company ? this.mapCompany(company) : null;
  }

  async updateDealerCompany(
    companyId: number,
    input: DealerCompanyUpdateInput,
  ): Promise<DealerCompany> {
    const existing = await this.database.dealerCompany.findUnique({
      where: { id: companyId },
    });
    if (!existing) {
      throw new NotFoundException("经销商企业不存在");
    }

    const terms = this.readRecord(existing.terms);
    const company = await this.database.dealerCompany.update({
      where: { id: companyId },
      data: {
        ...(input.legal_name !== undefined
          ? { legalName: input.legal_name }
          : {}),
        ...(input.display_name !== undefined
          ? { displayName: input.display_name }
          : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.tier_id !== undefined ? { tierId: input.tier_id } : {}),
        ...(input.price_list_id !== undefined
          ? { priceListId: input.price_list_id }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.public_listing !== undefined
          ? { publicListing: input.public_listing }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        terms: {
          ...terms,
          ...(input.website !== undefined ? { website: input.website } : {}),
          ...(input.business_type !== undefined
            ? { business_type: input.business_type }
            : {}),
          ...(input.tax_id !== undefined ? { tax_id: input.tax_id } : {}),
          ...(input.payment_terms !== undefined
            ? { payment_terms: input.payment_terms }
            : {}),
          ...(input.sales_territories !== undefined
            ? { sales_territories: input.sales_territories }
            : {}),
          ...(input.authorized_categories !== undefined
            ? { authorized_categories: input.authorized_categories }
            : {}),
          ...(input.sales_rep !== undefined
            ? { sales_rep: input.sales_rep }
            : {}),
        },
      },
    });

    return this.mapCompany(company);
  }

  async listDealerCompanies(
    query: DealerCompanyListQuery,
  ): Promise<ListResult<DealerCompany>> {
    const where = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.country !== undefined ? { country: query.country } : {}),
    };
    const [companies, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerCompany.count({ where }),
    ]);

    return {
      items: companies.map((company) => this.mapCompany(company)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async createDealerMember(
    input: DealerMemberCreateInput & { company_id: number },
  ): Promise<DealerMember> {
    const member = await this.database.dealerMember.create({
      data: {
        companyId: input.company_id,
        userId: input.user_id,
        role: input.role,
        permissions: input.permissions,
        status: "active",
      },
    });

    return this.mapMember(member);
  }

  async listDealerMembers(
    query: DealerMemberListQuery,
  ): Promise<ListResult<DealerMember>> {
    const where = {
      ...(query.company_id !== undefined
        ? { companyId: query.company_id }
        : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    };
    const [members, total] = await Promise.all([
      this.database.dealerMember.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
      this.database.dealerMember.count({ where }),
    ]);

    const userIds = members.map((member) => member.userId);
    const users =
      userIds.length > 0
        ? await this.database.user.findMany({
            where: { id: { in: userIds } },
          })
        : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    return {
      items: members.map((member) => {
        const user = userById.get(member.userId);
        return {
          ...this.mapMember(member),
          user: user
            ? { id: user.id, email: user.email, name: user.name }
            : null,
        };
      }),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async listDealerAddresses(companyId: number): Promise<DealerAddress[]> {
    const addresses = await readHashAll<DealerAddress>(
      this.redis,
      companyAddressesKey(companyId),
      (raw) => JSON.parse(raw) as DealerAddress,
    );
    return addresses.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async createDealerAddress(
    companyId: number,
    input: DealerAddressCreateInput,
  ): Promise<DealerAddress> {
    const address: DealerAddress = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:company:${companyId}:addresses:next`,
      ),
      company_id: companyId,
      kind: input.kind,
      payload: input.payload,
      public_listing: input.public_listing ?? null,
      created_at: new Date().toISOString(),
    };
    await writeHashObject(
      this.redis,
      companyAddressesKey(companyId),
      address.id,
      address,
    );
    return address;
  }

  private mapApplication(application: any): DealerApplication {
    const payload = this.readRecord(application.payload);
    return {
      id: application.id,
      application_no: application.applicationNo,
      applicant_user_id: application.applicantUserId ?? null,
      company_id: null,
      legal_name: application.legalName,
      display_name: this.requiredStringFrom(payload, "display_name"),
      country: application.country,
      website: this.nullableStringFrom(payload, "website"),
      business_type: this.requiredStringFrom(payload, "business_type"),
      tax_id: this.nullableStringFrom(payload, "tax_id"),
      contact_name: this.requiredStringFrom(payload, "contact_name"),
      contact_email: application.contactEmail,
      contact_phone: this.nullableStringFrom(payload, "contact_phone"),
      currency: this.requiredCurrencyFrom(payload),
      payload: application.payload,
      status: application.status as DealerApplicationStatus,
      submitted_at: application.submittedAt
        ? application.submittedAt.toISOString()
        : null,
      reviewed_at: application.reviewedAt
        ? application.reviewedAt.toISOString()
        : null,
      review_note: application.reviewNote ?? null,
      created_at: application.createdAt.toISOString(),
      updated_at: application.updatedAt.toISOString(),
    };
  }

  private mapCompany(company: any): DealerCompany {
    const terms = this.readRecord(company.terms);
    return {
      id: company.id,
      legal_name: company.legalName,
      display_name: company.displayName,
      country: company.country,
      website: this.nullableStringFrom(terms, "website"),
      business_type: this.requiredStringFrom(terms, "business_type"),
      tax_id: this.nullableStringFrom(terms, "tax_id"),
      tier_id: company.tierId ?? null,
      price_list_id: company.priceListId ?? null,
      currency: company.currency,
      payment_terms: this.requiredStringFrom(terms, "payment_terms"),
      sales_territories: this.jsonArrayFrom(terms, "sales_territories"),
      authorized_categories: this.jsonArrayFrom(terms, "authorized_categories"),
      sales_rep: this.nullableStringFrom(terms, "sales_rep"),
      public_listing: company.publicListing,
      status: company.status as DealerCompanyStatus,
      created_at: company.createdAt.toISOString(),
      archived_at: company.archivedAt ? company.archivedAt.toISOString() : null,
    };
  }

  private mapMember(member: any): DealerMember {
    return {
      id: member.id,
      company_id: member.companyId,
      user_id: member.userId,
      role: member.role,
      permissions: Array.isArray(member.permissions)
        ? (member.permissions as string[])
        : [],
      status: member.status as DealerMemberStatus,
      invited_at: null,
      joined_at: new Date().toISOString(),
    };
  }

  private readRecord(value: unknown): Record<string, JsonValue> {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, JsonValue>;
    }
    return {};
  }

  /** 必填字段直读 缺失即视为数据不完整 不伪造兜底值 */
  private requiredStringFrom(
    payload: Record<string, JsonValue>,
    key: string,
  ): string {
    const value = payload[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`经销商数据缺少必填字段 ${key}`);
    }
    return value;
  }

  private nullableStringFrom(
    payload: Record<string, JsonValue>,
    key: string,
  ): string | null {
    const value = payload[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  /** 币种必填直读 缺失或格式错误即报错 不伪造兜底值 */
  private requiredCurrencyFrom(payload: Record<string, JsonValue>): string {
    const value = payload["currency"];
    if (typeof value !== "string" || value.length !== 3) {
      throw new Error("经销商数据缺少必填字段 currency");
    }
    return value;
  }

  private jsonArrayFrom(
    payload: Record<string, JsonValue>,
    key: string,
  ): JsonValue {
    const value = payload[key];
    return Array.isArray(value) ? value : [];
  }

  async listTiers(): Promise<DealerTier[]> {
    const tiers = await this.database.dealerTier.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return tiers.map((tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      sort_order: tier.sortOrder,
      status: tier.status as DealerTier["status"],
      created_at: tier.createdAt.toISOString(),
    }));
  }

  async upsertTier(
    input: DealerTierUpsertInput & { id?: number },
  ): Promise<DealerTier> {
    if (input.id !== undefined) {
      const existing = await this.database.dealerTier.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new NotFoundException(`经销商等级 ${input.id} 不存在`);
      }
      const updated = await this.database.dealerTier.update({
        where: { id: input.id },
        data: {
          code: input.code,
          name: input.name,
          sortOrder: input.sort_order ?? existing.sortOrder,
          status: input.status ?? existing.status,
        },
      });
      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        sort_order: updated.sortOrder,
        status: updated.status as DealerTier["status"],
        created_at: updated.createdAt.toISOString(),
      };
    }
    const created = await this.database.dealerTier.create({
      data: {
        code: input.code,
        name: input.name,
        sortOrder: input.sort_order ?? 0,
        status: input.status ?? "active",
      },
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      sort_order: created.sortOrder,
      status: created.status as DealerTier["status"],
      created_at: created.createdAt.toISOString(),
    };
  }
}
