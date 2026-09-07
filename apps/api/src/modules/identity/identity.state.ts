import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import {
  type AccountAudience,
  type AuthSession,
  type AuthVerifyEmailInput,
  type IdentityAddress,
  type IdentityDataRequest,
  type IdentityNotification,
  type IdentityProfileUpdate,
  type IdentityRole,
  type IdentitySubscription,
  type IdentitySubscriptionStatus,
  type IdentityUser,
  type PermissionCode,
  type SessionActor,
} from "@wemo/contracts/identity";
import {
  type DealerApplication,
  type DealerApplicationCreateInput,
  type DealerApplicationReviewInput,
  type DealerApplicationStatus,
  type DealerAddress,
  type DealerCompany,
  type DealerCompanyStatus,
  type DealerContext,
  type DealerMember,
  type DealerMemberStatus,
  type DealerPublicListing,
} from "@wemo/contracts/dealers";
import { type JsonValue } from "@wemo/contracts/common";
import { createHash, randomUUID } from "node:crypto";

import { DATABASE_CLIENT } from "../../database/database.constants";

/**
 * Identity and dealer data access.
 *
 * The API contracts use snake_case while Prisma uses camelCase. This class is
 * the mapping boundary: all state is read from and written to normalized
 * Prisma entities, and no process-local state is retained here.
 */
@Injectable()
export class IdentityRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
  ) {}

  private readonly defaultRoleDefinitions: Record<AccountAudience, {
    code: string;
    name: string;
    permissions: PermissionCode[];
  }> = {
    user: {
      code: "user.default",
      name: "User",
      permissions: [
        "account:read",
        "account:write",
        "orders:read",
        "returns:read",
        "subscriptions:write",
      ],
    },
    dealer: {
      code: "dealer.admin",
      name: "Dealer Admin",
      permissions: [
        "dealer:read",
        "dealer:write",
        "dealer:company:read",
        "dealer:company:write",
        "dealer:member:read",
        "dealer:member:write",
        "dealer:application:write",
      ],
    },
    staff: {
      code: "staff.admin",
      name: "Staff Admin",
      permissions: [
        "settings:read",
        "settings:write",
        "audit:read",
        "jobs:read",
        "jobs:write",
        "reports:read",
        "integrations:read",
        "analytics:read",
        "identity:read",
        "identity:write",
        "dealers:read",
        "dealers:write",
        "catalog:read",
        "catalog:write",
        "content:read",
        "content:write",
        "media:read",
        "media:write",
        "search:read",
        "seo:read",
        "seo:write",
        "forms:read",
        "forms:write",
        "notifications:read",
        "notifications:write",
        "pricing:read",
        "pricing:write",
        "inventory:read",
        "inventory:write",
        "cart:read",
        "cart:write",
        "orders:read",
        "orders:write",
        "payments:read",
        "payments:write",
        "returns:read",
        "returns:write",
        "quotes:read",
        "quotes:write",
        "localization:read",
        "localization:write",
      ],
    },
  };

  private now(): Date {
    return new Date();
  }

  private toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  private toJson(value: unknown): JsonValue {
    return value as JsonValue;
  }

  // Prisma's Json input type is broader than the contract's recursive
  // JsonValue type. Keep that cast at this boundary.
  private jsonInput(value: JsonValue): any {
    return value;
  }

  private permissions(value: unknown): PermissionCode[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is PermissionCode =>
          typeof item === "string" && item.includes(":"),
      );
    }
    if (value && typeof value === "object") {
      const candidate = value as Record<string, unknown>;
      return [
        ...this.permissions(candidate.add),
        ...this.permissions(candidate.permissions),
      ];
    }
    return [];
  }

  private audience(value: string): AccountAudience {
    if (value === "user" || value === "dealer" || value === "staff") {
      return value;
    }
    throw new Error(`数据库中的账号受众无效: ${value}`);
  }

  private async audienceForUser(userId: number, client: any = this.database): Promise<AccountAudience> {
    const link = await client.userRole.findFirst({ where: { userId, status: "active" }, orderBy: [{ id: "asc" }] });
    if (!link) return "user";
    const role = await client.role.findUnique({ where: { id: link.roleId } });
    return role ? this.audience(role.audience) : "user";
  }

  private userStatus(value: string): IdentityUser["status"] {
    if (
      value === "pending_verification" ||
      value === "active" ||
      value === "suspended" ||
      value === "closed"
    ) {
      return value;
    }
    throw new Error(`数据库中的账号状态无效: ${value}`);
  }

  private mapUser(row: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    locale: string;
    status: string;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }, audience: AccountAudience = "user"): IdentityUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      locale: row.locale,
      audience,
      status: this.userStatus(row.status),
      verified_at: this.toIso(row.verifiedAt),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  private mapRole(row: any, permissions: unknown = []): IdentityRole {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      audience: this.audience(row.audience),
      permissions: this.permissions(permissions),
    };
  }

  private mapAddress(row: {
    id: number;
    userId: number;
    kind: string;
    payload: unknown;
    createdAt: Date;
  }): IdentityAddress {
    return {
      id: row.id,
      user_id: row.userId,
      kind: row.kind,
      payload: this.toJson(row.payload),
      created_at: row.createdAt.toISOString(),
    };
  }

  private mapSubscription(row: {
    id: number;
    userId: number;
    channel: string;
    status: string;
    consentAt: Date | null;
    createdAt: Date;
  }): IdentitySubscription {
    return {
      id: row.id,
      user_id: row.userId,
      channel: row.channel,
      status: row.status as IdentitySubscriptionStatus,
      consent_at: this.toIso(row.consentAt),
      created_at: row.createdAt.toISOString(),
    };
  }

  private mapDataRequest(row: {
    id: number;
    userId: number;
    type: string;
    status: string;
    requestNo: string;
    notes: string | null;
    requestedAt: Date;
    completedAt: Date | null;
  }): IdentityDataRequest {
    return {
      id: row.id,
      user_id: row.userId,
      kind: row.type,
      status: row.status as IdentityDataRequest["status"],
      request_id: row.requestNo,
      notes: row.notes,
      created_at: row.requestedAt.toISOString(),
      completed_at: this.toIso(row.completedAt),
    };
  }

  private mapNotification(row: any): IdentityNotification {
    const payload = row.payload && typeof row.payload === "object" ? row.payload as Record<string, any> : {};
    return {
      id: row.id,
      recipient_user_id: row.userId ?? null,
      company_id: row.companyId,
      audience: this.audience(payload.audience ?? "user"),
      kind: row.entityType ?? payload.kind ?? "notification",
      channel: row.channel,
      template_key: row.templateKey,
      status: row.status as IdentityNotification["status"],
      request_id: payload.request_id ?? "",
      payload: this.toJson(payload.data ?? row.payload),
      failure_reason: row.failureReason,
      created_at: row.createdAt.toISOString(),
      sent_at: this.toIso(row.sentAt),
    };
  }

  private terms(row: {
    terms: unknown;
    paymentTerms: unknown;
    salesTerritories: unknown;
    authorizedCategories: unknown;
  }): {
    payment_terms: string;
    sales_territories: JsonValue;
    authorized_categories: JsonValue;
  } {
    const legacy =
      row.terms && typeof row.terms === "object"
        ? (row.terms as Record<string, unknown>)
        : {};
    return {
      payment_terms:
        (typeof row.paymentTerms === "string" ? row.paymentTerms : null) ||
        (typeof legacy.payment_terms === "string" ? legacy.payment_terms : "Net 30"),
      sales_territories: this.toJson(
        row.salesTerritories ?? legacy.sales_territories ?? {},
      ),
      authorized_categories: this.toJson(
        row.authorizedCategories ?? legacy.authorized_categories ?? {},
      ),
    };
  }

  private mapCompany(row: {
    id: number;
    legalName: string;
    displayName: string;
    country: string;
    website: string | null;
    businessType: string | null;
    taxId: string | null;
    tierId: number | null;
    priceListId: number | null;
    currency: string;
    terms: unknown;
    paymentTerms: unknown;
    salesTerritories: unknown;
    authorizedCategories: unknown;
    salesRepId: number | null;
    publicListing: boolean;
    status: string;
    createdAt: Date;
    archivedAt: Date | null;
  }): DealerCompany {
    const companyTerms = this.terms(row);
    return {
      id: row.id,
      legal_name: row.legalName,
      display_name: row.displayName,
      country: row.country,
      website: row.website,
      business_type: row.businessType ?? "other",
      tax_id: row.taxId,
      tier_id: row.tierId,
      price_list_id: row.priceListId,
      currency: row.currency,
      payment_terms: companyTerms.payment_terms,
      sales_territories: companyTerms.sales_territories,
      authorized_categories: companyTerms.authorized_categories,
      sales_rep: row.salesRepId === null ? null : String(row.salesRepId),
      public_listing: row.publicListing,
      status: row.status as DealerCompanyStatus,
      created_at: row.createdAt.toISOString(),
      archived_at: this.toIso(row.archivedAt),
    };
  }

  private mapApplication(row: any): DealerApplication {
    const payload = row.payload && typeof row.payload === "object" ? row.payload as Record<string, any> : {};
    return {
      id: row.id,
      application_no: row.applicationNo,
      applicant_user_id: row.applicantUserId,
      company_id: payload.company_id ?? null,
      legal_name: row.legalName,
      display_name: payload.display_name ?? row.legalName,
      country: row.country,
      website: row.website,
      business_type: row.businessType ?? payload.business_type ?? "other",
      tax_id: row.taxId,
      contact_name: row.contactName,
      contact_email: row.contactEmail,
      contact_phone: row.contactPhone,
      currency: payload.currency ?? "USD",
      payload: this.toJson(row.payload),
      status: row.status as DealerApplicationStatus,
      submitted_at: this.toIso(row.submittedAt),
      reviewed_at: this.toIso(row.reviewedAt),
      review_note: payload.review_note ?? null,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  private mapMember(row: any): DealerMember {
    return {
      id: row.id,
      company_id: row.companyId,
      user_id: row.userId,
      role: row.role,
      permissions: this.permissions(row.permissions),
      status: row.status as DealerMemberStatus,
      invited_at: this.toIso(row.invitedAt),
      joined_at: (row.joinedAt ?? row.createdAt).toISOString(),
    };
  }

  private mapDealerAddress(row: {
    id: number;
    companyId: number;
    kind: string;
    payload: unknown;
    publicListing: unknown;
    createdAt: Date;
  }): DealerAddress {
    return {
      id: row.id,
      company_id: row.companyId,
      kind: row.kind,
      payload: this.toJson(row.payload),
      public_listing:
        row.publicListing === null ? null : this.toJson(row.publicListing),
      created_at: row.createdAt.toISOString(),
    };
  }

  private async ensureRoleForAudience(
    client: any,
    audience: AccountAudience,
  ): Promise<any> {
    const definition = this.defaultRoleDefinitions[audience];
    const existing = await client.role.findFirst({
      where: { audience },
      orderBy: [{ id: "asc" }],
    });
    if (existing) return existing;
    const role = await client.role.create({
      data: {
        code: definition.code,
        name: definition.name,
        audience,
      },
    });
    for (const code of definition.permissions) {
      const permission = await client.permission.upsert({
        where: { code },
        create: { code, module: code.split(":")[0]!, action: code.split(":").slice(1).join(":"), name: code },
        update: {},
      });
      await client.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
    return role;
  }

  private async permissionsForUser(
    userId: number,
    userAudience?: AccountAudience,
    client: any = this.database,
  ): Promise<PermissionCode[]> {
    const user = userAudience
      ? null
      : await client.user.findUnique({ where: { id: userId } });
    const audience = userAudience ?? (user ? "user" : null);
    if (!audience) return [];

    const roles = await client.role.findMany({
      where: { audience },
      orderBy: [{ id: "asc" }],
    });
    const userRoles = await client.userRole.findMany({
      where: { userId },
      orderBy: [{ id: "asc" }],
    });
    const permissions = new Set<PermissionCode>();
    for (const role of roles) {
      const assignments = await client.rolePermission.findMany({ where: { roleId: role.id } });
      const permissionRows = assignments.length ? await client.permission.findMany({ where: { id: { in: assignments.map((item: any) => item.permissionId) } } }) : [];
      for (const permission of permissionRows) permissions.add(permission.code as PermissionCode);
    }
    const removed = new Set<PermissionCode>();
    for (const assignment of userRoles) {
      const overrides = assignment.overrides;
      if (Array.isArray(overrides)) {
        for (const permission of this.permissions(overrides)) {
          permissions.add(permission);
        }
      } else if (overrides && typeof overrides === "object") {
        const value = overrides as Record<string, unknown>;
        for (const permission of this.permissions(value.add ?? value.permissions)) {
          permissions.add(permission);
        }
        for (const permission of this.permissions(value.remove)) {
          removed.add(permission);
        }
      }
    }
    for (const permission of removed) permissions.delete(permission);

    const member = await client.dealerMember.findFirst({
      where: { userId, status: "active" },
      orderBy: [{ id: "asc" }],
    });
    if (audience === "dealer" && !member) return [];
    if (member) {
      const company = await client.dealerCompany.findUnique({
        where: { id: member.companyId },
      });
      if (company && company.status === "active") {
      for (const permission of this.permissions(member.permissions)) {
        permissions.add(permission);
      }
      } else if (audience === "dealer") {
        return [];
      }
    }
    return [...permissions];
  }

  async listRoles(): Promise<IdentityRole[]> {
    await this.ensureRoleForAudience(this.database, "user");
    await this.ensureRoleForAudience(this.database, "dealer");
    await this.ensureRoleForAudience(this.database, "staff");
    const rows = await this.database.role.findMany({ orderBy: [{ id: "asc" }] });
    const result: IdentityRole[] = [];
    for (const row of rows) {
      const links = await this.database.rolePermission.findMany({ where: { roleId: row.id } });
      const perms = links.length ? await this.database.permission.findMany({ where: { id: { in: links.map((x) => x.permissionId) } } }) : [];
      result.push(this.mapRole(row, perms.map((x) => x.code)));
    }
    return result;
  }

  async createUser(input: {
    email: string;
    password: string;
    name: string;
    audience: AccountAudience;
    verified?: boolean;
  }): Promise<IdentityUser> {
    const duplicate = await this.database.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
    });
    if (duplicate) throw new ConflictException("邮箱已存在");

    const now = this.now();
    const row = await this.database.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: input.email,
          passwordHash: this.hashPassword(input.password),
          name: input.name,
          phone: null,
          locale: "en-US",
          status: input.verified ? "active" : "pending_verification",
          verifiedAt: input.verified ? now : null,
          createdAt: now,
          updatedAt: now,
        },
      });
      const role = await this.ensureRoleForAudience(transaction, input.audience);
      await transaction.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id, overrides: [] },
        update: {},
      });
      return user;
    });
    return this.mapUser(row);
  }

  async verifyEmail(input: AuthVerifyEmailInput): Promise<IdentityUser> {
    const current = await this.database.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
    });
    if (!current) throw new NotFoundException("用户不存在");
    const row = await this.database.user.update({
      where: { id: current.id },
      data: { status: "active", verifiedAt: this.now() },
    });
    return this.mapUser(row);
  }

  async authenticate(input: {
    email: string;
    password: string;
    audience?: AccountAudience | undefined;
  }): Promise<IdentityUser> {
    const current = await this.database.user.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
    });
    if (!current || current.passwordHash !== this.hashPassword(input.password)) {
      throw new ForbiddenException("邮箱或密码错误");
    }
    const audience = input.audience ?? "user";
    if (input.audience && audience !== input.audience) {
      throw new ForbiddenException("登录受众不匹配");
    }
    if (current.status === "closed") throw new ForbiddenException("账号已关闭");
    if (current.status === "suspended") throw new ForbiddenException("账号已暂停");
    if (current.status !== "active") throw new ForbiddenException("账号未激活");
    return this.mapUser(current, audience);
  }

  async getUserById(userId: number): Promise<IdentityUser> {
    const row = await this.database.user.findUnique({ where: { id: userId } });
    if (!row) throw new NotFoundException("用户不存在");
    return this.mapUser(row);
  }

  async getUserByEmail(email: string): Promise<IdentityUser | null> {
    const row = await this.database.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    return row ? this.mapUser(row) : null;
  }

  async updateProfile(
    userId: number,
    input: IdentityProfileUpdate,
  ): Promise<IdentityUser> {
    await this.getUserById(userId);
    const data: { name?: string; phone?: string | null; locale?: string } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.locale !== undefined) data.locale = input.locale;
    const row = await this.database.user.update({
      where: { id: userId },
      data,
    });
    return this.mapUser(row);
  }

  async setUserPermissions(
    userId: number,
    permissions: PermissionCode[],
  ): Promise<IdentityRole> {
    const user = await this.database.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const role = await this.ensureRoleForAudience(
      this.database,
      "user",
    );
    await this.database.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: {
        userId,
        roleId: role.id,
        overrides: this.jsonInput(permissions),
      },
      update: { overrides: this.jsonInput(permissions) },
    });
    return this.mapRole(role);
  }

  async listAddresses(userId: number): Promise<IdentityAddress[]> {
    await this.getUserById(userId);
    const rows = await this.database.address.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => this.mapAddress(row));
  }

  async addAddress(
    userId: number,
    input: { kind: string; payload: JsonValue },
  ): Promise<IdentityAddress> {
    await this.getUserById(userId);
    const row = await this.database.address.create({
      data: {
        userId,
        kind: input.kind,
        payload: this.jsonInput(input.payload),
      },
    });
    return this.mapAddress(row);
  }

  async listSubscriptions(userId: number): Promise<IdentitySubscription[]> {
    await this.getUserById(userId);
    const rows = await this.database.subscription.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => this.mapSubscription(row));
  }

  async upsertSubscription(
    userId: number,
    input: {
      channel: string;
      status: IdentitySubscriptionStatus;
      consent_at?: string | null | undefined;
    },
  ): Promise<IdentitySubscription> {
    await this.getUserById(userId);
    const row = await this.database.subscription.upsert({
      where: { userId_channel: { userId, channel: input.channel } },
      create: {
        userId,
        channel: input.channel,
        status: input.status,
        consentAt: input.consent_at ? new Date(input.consent_at) : null,
      },
      update: {
        status: input.status,
        consentAt: input.consent_at ? new Date(input.consent_at) : null,
      },
    });
    return this.mapSubscription(row);
  }

  async createDataRequest(
    userId: number,
    input: {
      kind: IdentityDataRequest["kind"];
      request_id: string;
      notes?: string | null;
    },
  ): Promise<IdentityDataRequest> {
    await this.getUserById(userId);
    const row = await this.database.privacyRequest.create({
      data: {
        userId,
        requestNo: `PR-${randomUUID()}`,
        type: input.kind,
        status: "requested",
        notes: input.notes ?? null,
      },
    });
    return this.mapDataRequest(row);
  }

  async listDataRequests(userId: number): Promise<IdentityDataRequest[]> {
    await this.getUserById(userId);
    const rows = await this.database.privacyRequest.findMany({
      where: { userId },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => this.mapDataRequest(row));
  }

  private async createNotification(
    client: any,
    input: {
      recipient_user_id: number | null;
      company_id: number | null;
      audience: AccountAudience;
      kind: string;
      channel: string;
      template_key: string;
      request_id: string;
      payload: JsonValue;
      status?: IdentityNotification["status"];
      failure_reason?: string | null;
    },
  ): Promise<IdentityNotification> {
    const status = input.status ?? "queued";
    const row = await client.notificationDelivery.create({
      data: {
        userId: input.recipient_user_id,
        companyId: input.company_id,
        channel: input.channel,
        templateKey: input.template_key,
        status,
        entityType: input.kind,
        payload: this.jsonInput({ audience: input.audience, request_id: input.request_id, data: input.payload }),
        failureReason: input.failure_reason ?? null,
        sentAt: status === "sent" ? this.now() : null,
      },
    });
    return this.mapNotification(row);
  }

  async recordNotification(input: {
    recipient_user_id: number | null;
    company_id: number | null;
    audience: AccountAudience;
    kind: string;
    channel: string;
    template_key: string;
    request_id: string;
    payload: JsonValue;
    status?: IdentityNotification["status"];
    failure_reason?: string | null;
  }): Promise<IdentityNotification> {
    return this.createNotification(this.database, input);
  }

  async listNotifications(query: {
    recipient_user_id?: number | undefined;
    company_id?: number | undefined;
    audience?: AccountAudience | undefined;
    status?: IdentityNotification["status"] | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: IdentityNotification[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const where: any = {};
    if (query.recipient_user_id !== undefined) {
      where.recipientUserId = query.recipient_user_id;
    }
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.audience !== undefined) where.payload = { path: ["audience"], equals: query.audience };
    if (query.status !== undefined) where.status = query.status;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.notificationDelivery.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.notificationDelivery.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapNotification(row)),
      page,
      page_size: pageSize,
      total,
    };
  }

  async createDealerApplication(
    input: DealerApplicationCreateInput & {
      applicant_user_id: number | null;
      request_id: string;
      payload: JsonValue;
    },
  ): Promise<DealerApplication> {
    const duplicate = await this.database.dealerApplication.findFirst({
      where: {
        status: { not: "rejected" },
        OR: [
          { legalName: { equals: input.legal_name, mode: "insensitive" } },
          { contactEmail: { equals: input.contact_email, mode: "insensitive" } },
        ],
      },
    });
    if (duplicate) throw new ConflictException("该邮箱或企业已存在待处理申请");

    const row = await this.database.$transaction(async (transaction) => {
      const created = await transaction.dealerApplication.create({
        data: {
          applicationNo: `TMP-${randomUUID()}`,
          applicantUserId: input.applicant_user_id,
          legalName: input.legal_name,
          country: input.country,
          website: input.website ?? null,
          businessType: input.business_type,
          taxId: input.tax_id ?? null,
          contactName: input.contact_name,
          contactEmail: input.contact_email,
          contactPhone: input.contact_phone ?? null,
          payload: this.jsonInput({ ...(input.payload as any), display_name: input.display_name, currency: input.currency }),
          status: "draft",
          submittedAt: null,
          reviewedAt: null,
        },
      });
      return transaction.dealerApplication.update({
        where: { id: created.id },
        data: { applicationNo: `DA-${String(created.id).padStart(6, "0")}` },
      });
    });
    return this.mapApplication(row);
  }

  async listDealerApplications(query: {
    status?: DealerApplicationStatus | undefined;
    country?: string | undefined;
    applicant_user_id?: number | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: DealerApplication[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const where: {
      status?: string;
      country?: string;
      applicantUserId?: number;
    } = {};
    if (query.status !== undefined) where.status = query.status;
    if (query.country !== undefined) where.country = query.country;
    if (query.applicant_user_id !== undefined) {
      where.applicantUserId = query.applicant_user_id;
    }
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.dealerApplication.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.dealerApplication.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapApplication(row)),
      page,
      page_size: pageSize,
      total,
    };
  }

  async getDealerApplication(id: number): Promise<DealerApplication> {
    const row = await this.database.dealerApplication.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("经销商申请不存在");
    return this.mapApplication(row);
  }

  async submitDealerApplication(
    id: number,
    request_id: string,
    applicantUserId: number | null,
    note?: string,
  ): Promise<DealerApplication> {
    const result = await this.database.$transaction(async (transaction) => {
      const current = await transaction.dealerApplication.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("经销商申请不存在");
      if (current.status === "approved") {
        throw new ConflictException("已通过的申请不能再次提交");
      }
      const row = await transaction.dealerApplication.update({
        where: { id },
        data: {
          applicantUserId: current.applicantUserId ?? applicantUserId,
          status: "submitted",
          submittedAt: this.now(),
          rejectionReason: note ?? current.rejectionReason,
        },
      });
      if (row.applicantUserId) {
        await this.createNotification(transaction, {
          recipient_user_id: row.applicantUserId,
          company_id: null,
          audience: "dealer",
          kind: "dealer.application.submitted",
          channel: "email",
          template_key: "dealer_application_submitted",
          request_id,
          payload: { application_id: row.id, application_no: row.applicationNo },
          status: "sent",
        });
      }
      return row;
    });
    return this.mapApplication(result);
  }

  async reviewDealerApplication(
    id: number,
    input: DealerApplicationReviewInput,
    reviewerUserId: number,
    request_id: string,
  ): Promise<{
    application: DealerApplication;
    company: DealerCompany | null;
    member: DealerMember | null;
  }> {
    void reviewerUserId;
    const result = await this.database.$transaction(async (transaction) => {
      const current = await transaction.dealerApplication.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("经销商申请不存在");
      if (current.status === "approved" || current.status === "rejected") {
        throw new ConflictException("申请已处理");
      }

      let companyRow: any = null;
      let memberRow: any = null;
      if (input.decision === "approved") {
        companyRow = await transaction.dealerCompany.create({
          data: {
            legalName: current.legalName,
            displayName: String((current.payload as any)?.display_name ?? current.legalName),
            country: current.country,
            website: current.website,
            businessType: current.businessType,
            taxId: current.taxId,
            tierId: input.tier_id ?? null,
            priceListId: input.price_list_id ?? null,
            currency: String((current.payload as any)?.currency ?? "USD"),
            terms: this.jsonInput({
              payment_terms: input.payment_terms ?? "Net 30",
              sales_territories:
                input.sales_territories ?? { countries: [current.country] },
              authorized_categories: input.authorized_categories ?? { ids: [] },
              sales_rep: input.sales_rep ?? null,
            }),
            paymentTerms: this.jsonInput(input.payment_terms ?? "Net 30"),
            salesTerritories: this.jsonInput(
              input.sales_territories ?? { countries: [current.country] },
            ),
            authorizedCategories: this.jsonInput(
              input.authorized_categories ?? { ids: [] },
            ),
            salesRepId: input.sales_rep && /^\d+$/.test(input.sales_rep) ? Number(input.sales_rep) : null,
            publicListing: input.public_listing ?? true,
            status: "active",
          },
        });
        if (current.applicantUserId) {
          memberRow = await transaction.dealerMember.create({
            data: {
              companyId: companyRow.id,
              userId: current.applicantUserId,
              role: "admin",
              permissions: this.jsonInput([
                "dealer:read",
                "dealer:write",
                "dealer:company:read",
                "dealer:company:write",
              ]),
              status: "active",
              invitedAt: null,
              joinedAt: this.now(),
            },
          });
        }
      }

      const applicationRow = await transaction.dealerApplication.update({
        where: { id },
        data: {
          status: input.decision,
          reviewedAt: this.now(),
          rejectionReason: input.decision === "rejected" ? input.reason ?? null : null,
        },
      });
      await transaction.dealerApplicationReview.create({
        data: {
          applicationId: id,
          reviewerId: reviewerUserId,
          fromStatus: current.status,
          toStatus: input.decision,
          decision: input.decision,
          notes: input.reason ?? null,
        },
      });
      if (applicationRow.applicantUserId) {
        await this.createNotification(transaction, {
          recipient_user_id: applicationRow.applicantUserId,
          company_id: companyRow?.id ?? null,
          audience: "dealer",
          kind: `dealer.application.${input.decision}`,
          channel: "email",
          template_key:
            input.decision === "approved"
              ? "dealer_application_approved"
              : input.decision === "under_review"
                ? "dealer_application_under_review"
                : "dealer_application_rejected",
          request_id,
          payload: {
            application_id: applicationRow.id,
            application_no: applicationRow.applicationNo,
            company_id: companyRow?.id ?? null,
          },
          status: "sent",
        });
      }
      return { applicationRow, companyRow, memberRow };
    });

    return {
      application: this.mapApplication(result.applicationRow),
      company: result.companyRow ? this.mapCompany(result.companyRow) : null,
      member: result.memberRow ? this.mapMember(result.memberRow) : null,
    };
  }

  async listPublicDealerListings(query: {
    country?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: DealerPublicListing[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const where: { status: string; publicListing: boolean; country?: string } = {
      status: "active",
      publicListing: true,
    };
    if (query.country !== undefined) where.country = query.country;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.dealerCompany.count({ where }),
    ]);
    const addresses = rows.length
      ? await this.database.dealerAddress.findMany({
          where: { companyId: { in: rows.map((row) => row.id) } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      : [];
    return {
      items: rows.map((row) => ({
        company: this.mapCompany(row),
        addresses: addresses
          .filter((address) => address.companyId === row.id)
          .map((address) => this.mapDealerAddress(address)),
      })),
      page,
      page_size: pageSize,
      total,
    };
  }

  async updateDealerCompany(
    companyId: number,
    patch: {
      legal_name?: string | undefined;
      display_name?: string | undefined;
      country?: string | undefined;
      website?: string | null | undefined;
      business_type?: string | undefined;
      tax_id?: string | null | undefined;
      tier_id?: number | null | undefined;
      price_list_id?: number | null | undefined;
      currency?: string | undefined;
      payment_terms?: string | undefined;
      sales_territories?: JsonValue | undefined;
      authorized_categories?: JsonValue | undefined;
      sales_rep?: string | null | undefined;
      public_listing?: boolean | undefined;
      status?: DealerCompanyStatus | undefined;
    },
  ): Promise<DealerCompany> {
    const current = await this.database.dealerCompany.findUnique({
      where: { id: companyId },
    });
    if (!current) throw new NotFoundException("经销商企业不存在");
    const currentTerms =
      current.terms && typeof current.terms === "object"
        ? (current.terms as Record<string, unknown>)
        : {};
    const data: Record<string, unknown> = {};
    if (patch.legal_name !== undefined) data.legalName = patch.legal_name;
    if (patch.display_name !== undefined) data.displayName = patch.display_name;
    if (patch.country !== undefined) data.country = patch.country;
    if (patch.website !== undefined) data.website = patch.website;
    if (patch.business_type !== undefined) data.businessType = patch.business_type;
    if (patch.tax_id !== undefined) data.taxId = patch.tax_id;
    if (patch.tier_id !== undefined) data.tierId = patch.tier_id;
    if (patch.price_list_id !== undefined) data.priceListId = patch.price_list_id;
    if (patch.currency !== undefined) data.currency = patch.currency;
    if (patch.payment_terms !== undefined) data.paymentTerms = patch.payment_terms;
    if (patch.sales_territories !== undefined) {
      data.salesTerritories = this.jsonInput(patch.sales_territories);
    }
    if (patch.authorized_categories !== undefined) {
      data.authorizedCategories = this.jsonInput(patch.authorized_categories);
    }
    if (patch.sales_rep !== undefined) data.salesRepId = patch.sales_rep && /^\d+$/.test(patch.sales_rep) ? Number(patch.sales_rep) : null;
    if (patch.public_listing !== undefined) data.publicListing = patch.public_listing;
    if (patch.status !== undefined) data.status = patch.status;
    if (
      patch.payment_terms !== undefined ||
      patch.sales_territories !== undefined ||
      patch.authorized_categories !== undefined ||
      patch.sales_rep !== undefined
    ) {
      data.terms = this.jsonInput({
        ...currentTerms,
        ...(patch.payment_terms !== undefined
          ? { payment_terms: patch.payment_terms }
          : {}),
        ...(patch.sales_territories !== undefined
          ? { sales_territories: patch.sales_territories }
          : {}),
        ...(patch.authorized_categories !== undefined
          ? { authorized_categories: patch.authorized_categories }
          : {}),
        ...(patch.sales_rep !== undefined ? { sales_rep: patch.sales_rep } : {}),
      });
    }
    const row = await this.database.dealerCompany.update({
      where: { id: companyId },
      data: data as never,
    });
    return this.mapCompany(row);
  }

  async getDealerCompany(companyId: number): Promise<DealerCompany> {
    const row = await this.database.dealerCompany.findUnique({ where: { id: companyId } });
    if (!row) throw new NotFoundException("经销商企业不存在");
    return this.mapCompany(row);
  }

  async listDealerCompanies(query: {
    status?: DealerCompanyStatus | undefined;
    country?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: DealerCompany[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const where: { status?: string; country?: string } = {};
    if (query.status !== undefined) where.status = query.status;
    if (query.country !== undefined) where.country = query.country;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.dealerCompany.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.dealerCompany.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapCompany(row)),
      page,
      page_size: pageSize,
      total,
    };
  }

  async listDealerMembers(query: {
    company_id?: number | undefined;
    status?: DealerMemberStatus | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: DealerMember[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const where: { companyId?: number; status?: string } = {};
    if (query.company_id !== undefined) where.companyId = query.company_id;
    if (query.status !== undefined) where.status = query.status;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.dealerMember.findMany({
        where,
        orderBy: [{ id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.dealerMember.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapMember(row)),
      page,
      page_size: pageSize,
      total,
    };
  }

  async listDealerAddresses(companyId: number): Promise<DealerAddress[]> {
    await this.getDealerCompany(companyId);
    const rows = await this.database.dealerAddress.findMany({
      where: { companyId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => this.mapDealerAddress(row));
  }

  async addDealerAddress(
    companyId: number,
    input: {
      kind: string;
      payload: JsonValue;
      public_listing?: JsonValue | null | undefined;
    },
  ): Promise<DealerAddress> {
    const company = await this.database.dealerCompany.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException("经销商企业不存在");
    if (company.status === "closed") {
      throw new ForbiddenException("企业已关闭，不能新增地址");
    }
    const row = await this.database.dealerAddress.create({
      data: {
        companyId,
        kind: input.kind,
        payload: this.jsonInput(input.payload),
        publicListing:
          input.public_listing === undefined
            ? null
            : this.jsonInput(input.public_listing),
      },
    });
    return this.mapDealerAddress(row);
  }

  async inviteDealerMember(input: {
    company_id: number;
    user_id: number;
    role: string;
    permissions: PermissionCode[];
  }): Promise<DealerMember> {
    const company = await this.database.dealerCompany.findUnique({
      where: { id: input.company_id },
    });
    if (!company) throw new NotFoundException("经销商企业不存在");
    if (company.status !== "active") {
      throw new ForbiddenException("企业当前不可邀请成员");
    }
    const user = await this.database.user.findUnique({ where: { id: input.user_id } });
    if (!user) throw new NotFoundException("用户不存在");
    const joinedAt = this.now();
    const row = await this.database.dealerMember.upsert({
      where: {
        companyId_userId: {
          companyId: input.company_id,
          userId: input.user_id,
        },
      },
      create: {
        companyId: input.company_id,
        userId: input.user_id,
        role: input.role,
        permissions: this.jsonInput(input.permissions),
        status: "active",
        invitedAt: joinedAt,
        joinedAt,
      },
      update: {
        role: input.role,
        permissions: this.jsonInput(input.permissions),
        status: "active",
        joinedAt,
      },
    });
    return this.mapMember(row);
  }

  async setDealerCompanyStatus(
    companyId: number,
    status: DealerCompanyStatus,
  ): Promise<DealerCompany> {
    return this.updateDealerCompany(companyId, { status });
  }

  async getDealerContextForUser(userId: number): Promise<DealerContext | null> {
    const member = await this.database.dealerMember.findFirst({
      where: { userId, status: "active" },
      orderBy: [{ id: "asc" }],
    });
    if (!member) return null;
    const company = await this.database.dealerCompany.findFirst({
      where: { id: member.companyId, status: "active" },
    });
    if (!company) return null;
    return {
      company_id: company.id,
      display_name: company.displayName,
      status: company.status as DealerCompanyStatus,
      currency: company.currency,
      permissions: this.permissions(member.permissions),
    };
  }

  async issueSession(userId: number, requestId: string): Promise<AuthSession> {
    const user = await this.database.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const audience = await this.audienceForUser(user.id);
    const member = await this.database.dealerMember.findFirst({
      where: { userId, status: "active" },
      orderBy: [{ id: "asc" }],
    });
    const company = member
      ? await this.database.dealerCompany.findFirst({
          where: { id: member.companyId, status: "active" },
        })
      : null;
    if (audience === "dealer" && !company) {
      throw new ForbiddenException("经销商账号未绑定有效企业");
    }
    const permissions = await this.permissionsForUser(user.id, audience);
    const now = this.now();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const token = randomUUID();
    const row = await this.database.$transaction(async (transaction) => {
      const session = await transaction.session.create({
        data: {
          userId: user.id,
          sessionTokenHash: this.hashToken(token),
          audience,
          expiresAt,
          revokedAt: null,
          lastSeenAt: now,
          createdAt: now,
        },
      });
      await this.createNotification(transaction, {
        recipient_user_id: user.id,
        company_id: company?.id ?? null,
        audience,
        kind: "account.session.created",
        channel: "email",
        template_key: "account_session_created",
        request_id: requestId,
        payload: { audience, session_id: session.id },
        status: "sent",
      });
      return session;
    });
    return {
      id: row.id,
      token,
      user_id: row.userId,
      audience: this.audience(row.audience),
      company_id: company?.id ?? null,
      permissions,
      expires_at: row.expiresAt.toISOString(),
      revoked_at: this.toIso(row.revokedAt),
      last_seen_at: (row.lastSeenAt ?? row.createdAt).toISOString(),
      created_at: row.createdAt.toISOString(),
    };
  }

  async resolveActorFromToken(token: string): Promise<SessionActor | null> {
    const session = await this.database.session.findUnique({ where: { sessionTokenHash: this.hashToken(token) } });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    const user = await this.database.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== "active") return null;
    const audience = this.audience(session.audience);
    const permissions = await this.permissionsForUser(user.id, audience);
    if (audience === "dealer") {
      const member = await this.database.dealerMember.findFirst({ where: { userId: user.id, status: "active" }, orderBy: [{ id: "asc" }] });
      const company = member
        ? await this.database.dealerCompany.findFirst({
            where: { id: member.companyId, status: "active" },
          })
        : null;
      if (!company) return null;
      if (!member) return null;
      const memberPermissions = this.permissions(member.permissions);
      return {
        user_id: user.id,
        audience,
        company_id: company.id,
        permissions: memberPermissions.length ? memberPermissions : permissions,
      };
    }
    return {
      user_id: user.id,
      audience,
      permissions,
    };
  }

  async getSessionByToken(token: string): Promise<AuthSession | null> {
    const row = await this.database.session.findUnique({ where: { sessionTokenHash: this.hashToken(token) } });
    if (!row) return null;
    return this.mapSession(row);
  }

  async revokeSession(token: string): Promise<AuthSession> {
    const existing = await this.database.session.findUnique({ where: { sessionTokenHash: this.hashToken(token) } });
    if (!existing) throw new NotFoundException("会话不存在");
    const row = await this.database.session.update({
      where: { id: existing.id },
      data: { revokedAt: this.now() },
    });
    return this.mapSession(row);
  }

  async listSessions(query: {
    user_id?: number | undefined;
    audience?: AccountAudience | undefined;
    status?: "active" | "revoked" | "expired" | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): Promise<{
    items: AuthSession[];
    page: number;
    page_size: number;
    total: number;
  }> {
    const now = this.now();
    const where: {
      userId?: number;
      audience?: string;
      revokedAt?: { not?: null; equals?: null };
      expiresAt?: { lt?: Date; gte?: Date };
    } = {};
    if (query.user_id !== undefined) where.userId = query.user_id;
    if (query.audience !== undefined) where.audience = query.audience;
    if (query.status === "active") {
      where.revokedAt = { equals: null };
      where.expiresAt = { gte: now };
    } else if (query.status === "revoked") {
      where.revokedAt = { not: null };
    } else if (query.status === "expired") {
      where.expiresAt = { lt: now };
    }
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const [rows, total] = await Promise.all([
      this.database.session.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.session.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapSession(row)),
      page,
      page_size: pageSize,
      total,
    };
  }

  private mapSession(row: {
    id: number;
    sessionTokenHash: string;
    userId: number;
    audience: string;
    expiresAt: Date;
    revokedAt: Date | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }): AuthSession {
    return {
      id: row.id,
      token: "",
      user_id: row.userId,
      audience: this.audience(row.audience),
      company_id: null,
      permissions: [],
      expires_at: row.expiresAt.toISOString(),
      revoked_at: this.toIso(row.revokedAt),
      last_seen_at: (row.lastSeenAt ?? row.createdAt).toISOString(),
      created_at: row.createdAt.toISOString(),
    };
  }

  private hashPassword(password: string): string {
    return createHash("sha256").update(`wemo:${password}`).digest("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(`wemo-session:${token}`).digest("hex");
  }
}
