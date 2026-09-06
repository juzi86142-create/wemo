import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
import { randomUUID, createHash } from "node:crypto";

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function hashPassword(password: string): string {
  return createHash("sha256").update(`wemo:${password}`).digest("hex");
}

function tokenToIsoHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

type StoredUser = IdentityUser & { password_hash: string };

type SessionRecord = AuthSession;

type NotificationInput = {
  recipient_user_id: number | null;
  company_id: number | null;
  audience: AccountAudience;
  kind: string;
  channel: string;
  template_key: string;
  request_id: string;
  payload: JsonValue;
  status?: "queued" | "sent" | "failed";
  failure_reason?: string | null;
};

const defaultRoles: IdentityRole[] = [
  {
    id: 1,
    code: "user.default",
    name: "User",
    audience: "user",
    permissions: ["account:read", "account:write", "orders:read", "returns:read", "subscriptions:write"],
  },
  {
    id: 2,
    code: "dealer.admin",
    name: "Dealer Admin",
    audience: "dealer",
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
  {
    id: 3,
    code: "staff.admin",
    name: "Staff Admin",
    audience: "staff",
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
];

@Injectable()
export class IdentityStateStore {
  private userSeq = 1;
  private sessionSeq = 1;
  private addressSeq = 1;
  private subscriptionSeq = 1;
  private dataRequestSeq = 1;
  private dealerApplicationSeq = 1;
  private dealerCompanySeq = 2;
  private dealerMemberSeq = 2;
  private notificationSeq = 1;

  private readonly users: StoredUser[] = [
    this.createSeedUser({
      email: "user@wemove.local",
      name: "Wemove User",
      password: "user-pass",
      audience: "user",
      status: "active",
      verified_at: nowIso(),
    }),
    this.createSeedUser({
      email: "dealer@wemove.local",
      name: "Wemove Dealer",
      password: "dealer-pass",
      audience: "dealer",
      status: "active",
      verified_at: nowIso(),
    }),
    this.createSeedUser({
      email: "staff@wemove.local",
      name: "Wemove Staff",
      password: "staff-pass",
      audience: "staff",
      status: "active",
      verified_at: nowIso(),
    }),
  ];

  private readonly roles: IdentityRole[] = defaultRoles;
  private readonly userPermissionOverrides = new Map<number, PermissionCode[]>();
  private readonly addresses: IdentityAddress[] = [];
  private readonly dealerAddresses: DealerAddress[] = [];
  private readonly subscriptions: IdentitySubscription[] = [];
  private readonly dataRequests: IdentityDataRequest[] = [];
  private readonly dealerApplications: DealerApplication[] = [
    this.createSeedDealerApplication({
      legal_name: "Demo Toys Ltd.",
      display_name: "Demo Toys",
      country: "US",
      website: "https://demo.example.com",
      business_type: "distributor",
      tax_id: "DEMO-123",
      contact_name: "Dealer Admin",
      contact_email: "dealer@wemove.local",
      contact_phone: "+1-555-0100",
      currency: "USD",
      payload: { notes: "Seed application" },
      applicant_user_id: 2,
      status: "approved",
      submitted_at: nowIso(),
      reviewed_at: nowIso(),
      review_note: "Seeded active dealer",
      company_id: 1,
    }),
  ];
  private readonly dealerCompanies: DealerCompany[] = [
    {
      id: 1,
      legal_name: "Demo Toys Ltd.",
      display_name: "Demo Toys",
      country: "US",
      website: "https://demo.example.com",
      business_type: "distributor",
      tax_id: "DEMO-123",
      tier_id: 1,
      price_list_id: 1,
      currency: "USD",
      payment_terms: "Net 30",
      sales_territories: { countries: ["US"] },
      authorized_categories: { ids: [1, 2] },
      sales_rep: "demo.representative@wemove.local",
      public_listing: true,
      status: "active",
      created_at: nowIso(),
      archived_at: null,
    },
  ];
  private readonly dealerMembers: DealerMember[] = [
    {
      id: 1,
      company_id: 1,
      user_id: 2,
      role: "admin",
      permissions: ["dealer:read", "dealer:write", "dealer:company:read", "dealer:member:write"],
      status: "active",
      invited_at: null,
      joined_at: nowIso(),
    },
  ];
  private readonly sessions: SessionRecord[] = [];
  private readonly notifications: IdentityNotification[] = [];

  private createSeedUser(input: {
    email: string;
    name: string;
    password: string;
    audience: AccountAudience;
    status: IdentityUser["status"];
    verified_at: string | null;
  }): StoredUser {
    return {
      id: this.userSeq++,
      email: input.email,
      name: input.name,
      phone: null,
      locale: "en-US",
      audience: input.audience,
      status: input.status,
      verified_at: input.verified_at,
      created_at: nowIso(),
      updated_at: nowIso(),
      password_hash: hashPassword(input.password),
    };
  }

  private createSeedDealerApplication(input: {
    legal_name: string;
    display_name: string;
    country: string;
    website: string;
    business_type: string;
    tax_id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    currency: string;
    payload: JsonValue;
    applicant_user_id: number | null;
    status: DealerApplicationStatus;
    submitted_at: string | null;
    reviewed_at: string | null;
    review_note: string | null;
    company_id: number | null;
  }): DealerApplication {
    const id = this.dealerApplicationSeq++;
    return {
      id,
      application_no: `DA-${String(id).padStart(6, "0")}`,
      applicant_user_id: input.applicant_user_id,
      company_id: input.company_id,
      legal_name: input.legal_name,
      display_name: input.display_name,
      country: input.country,
      website: input.website,
      business_type: input.business_type,
      tax_id: input.tax_id,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone,
      currency: input.currency,
      payload: clone(input.payload),
      status: input.status,
      submitted_at: input.submitted_at,
      reviewed_at: input.reviewed_at,
      review_note: input.review_note,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
  }

  private getUserIndexById(userId: number): number {
    const index = this.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new NotFoundException("用户不存在");
    }
    return index;
  }

  private getUserIndexByEmail(email: string): number {
    const index = this.users.findIndex((user) => user.email.toLowerCase() === email.toLowerCase());
    if (index < 0) {
      throw new NotFoundException("用户不存在");
    }
    return index;
  }

  private getDealerCompanyById(companyId: number): DealerCompany {
    const company = this.dealerCompanies.find((entry) => entry.id === companyId);
    if (!company) {
      throw new NotFoundException("经销商企业不存在");
    }
    return company;
  }

  private getDealerMemberForUser(userId: number): DealerMember | null {
    return this.dealerMembers.find(
      (member) => member.user_id === userId && member.status === "active",
    ) ?? null;
  }

  private getActiveDealerCompanyForUser(userId: number): DealerCompany | null {
    const member = this.getDealerMemberForUser(userId);
    if (!member) {
      return null;
    }

    const company = this.dealerCompanies.find(
      (entry) => entry.id === member.company_id && entry.status === "active",
    );
    return company ?? null;
  }

  private permissionsForUser(userId: number): PermissionCode[] {
    const user = this.users.find((entry) => entry.id === userId);
    if (!user) {
      return [];
    }

    const role = this.roles.find((entry) => entry.audience === user.audience);
    const permissions = new Set<PermissionCode>(role?.permissions ?? []);

    for (const permission of this.userPermissionOverrides.get(userId) ?? []) {
      permissions.add(permission);
    }

    const company = this.getActiveDealerCompanyForUser(userId);
    if (company) {
      const member = this.getDealerMemberForUser(userId);
      for (const permission of member?.permissions ?? []) {
        permissions.add(permission as PermissionCode);
      }
      if (company.status !== "active") {
        permissions.clear();
      }
    }

    return [...permissions];
  }

  listRoles(): IdentityRole[] {
    return clone(this.roles);
  }

  createUser(input: {
    email: string;
    password: string;
    name: string;
    audience: AccountAudience;
    verified?: boolean;
  }): IdentityUser {
    if (this.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ConflictException("邮箱已存在");
    }

    const user: StoredUser = {
      id: this.userSeq++,
      email: input.email,
      name: input.name,
      phone: null,
      locale: "en-US",
      audience: input.audience,
      status: input.verified ? "active" : "pending_verification",
      verified_at: input.verified ? nowIso() : null,
      created_at: nowIso(),
      updated_at: nowIso(),
      password_hash: hashPassword(input.password),
    };

    this.users.push(user);
    return clone({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      audience: user.audience,
      status: user.status,
      verified_at: user.verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  }

  verifyEmail(input: AuthVerifyEmailInput): IdentityUser {
    const index = this.getUserIndexByEmail(input.email);
    const current = this.users[index]!;
    const next: StoredUser = {
      ...current,
      status: "active",
      verified_at: nowIso(),
      updated_at: nowIso(),
    };
    this.users[index] = next;
    return this.toUser(next);
  }

  authenticate(input: { email: string; password: string; audience?: AccountAudience | undefined }): IdentityUser {
    const index = this.getUserIndexByEmail(input.email);
    const current = this.users[index]!;
    if (current.password_hash !== hashPassword(input.password)) {
      throw new ForbiddenException("邮箱或密码错误");
    }
    if (input.audience && current.audience !== input.audience) {
      throw new ForbiddenException("登录受众不匹配");
    }
    if (current.status === "closed") {
      throw new ForbiddenException("账号已关闭");
    }
    if (current.status === "suspended") {
      throw new ForbiddenException("账号已暂停");
    }
    if (current.status !== "active") {
      throw new ForbiddenException("账号未激活");
    }
    return this.toUser(current);
  }

  getUserById(userId: number): IdentityUser {
    return this.toUser(this.users[this.getUserIndexById(userId)]!);
  }

  getUserByEmail(email: string): IdentityUser | null {
    const current = this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    return current ? this.toUser(current) : null;
  }

  updateProfile(userId: number, input: IdentityProfileUpdate): IdentityUser {
    const index = this.getUserIndexById(userId);
    const current = this.users[index]!;
    const next: StoredUser = {
      ...current,
      name: input.name ?? current.name,
      phone: input.phone !== undefined ? input.phone : current.phone,
      locale: input.locale ?? current.locale,
      updated_at: nowIso(),
    };
    this.users[index] = next;
    return this.toUser(next);
  }

  setUserPermissions(userId: number, permissions: PermissionCode[]): IdentityRole {
    if (!this.users.some((user) => user.id === userId)) {
      throw new NotFoundException("用户不存在");
    }
    this.userPermissionOverrides.set(userId, permissions);
    return this.roles.find((role) => role.audience === "staff")!;
  }

  listAddresses(userId: number): IdentityAddress[] {
    return this.addresses
      .filter((entry) => entry.user_id === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((entry) => clone(entry));
  }

  addAddress(userId: number, input: { kind: string; payload: JsonValue }): IdentityAddress {
    const user = this.getUserById(userId);
    const address: IdentityAddress = {
      id: this.addressSeq++,
      user_id: user.id,
      kind: input.kind,
      payload: clone(input.payload),
      created_at: nowIso(),
    };
    this.addresses.push(address);
    return clone(address);
  }

  listSubscriptions(userId: number): IdentitySubscription[] {
    return this.subscriptions
      .filter((entry) => entry.user_id === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((entry) => clone(entry));
  }

  upsertSubscription(userId: number, input: { channel: string; status: IdentitySubscriptionStatus; consent_at?: string | null | undefined }): IdentitySubscription {
    const existingIndex = this.subscriptions.findIndex(
      (entry) => entry.user_id === userId && entry.channel === input.channel,
    );
    const next: IdentitySubscription = {
      id: existingIndex >= 0 ? this.subscriptions[existingIndex]!.id : this.subscriptionSeq++,
      user_id: userId,
      channel: input.channel,
      status: input.status,
      consent_at: input.consent_at ?? null,
      created_at: existingIndex >= 0 ? this.subscriptions[existingIndex]!.created_at : nowIso(),
    };

    if (existingIndex >= 0) {
      this.subscriptions[existingIndex] = next;
    } else {
      this.subscriptions.push(next);
    }

    return clone(next);
  }

  createDataRequest(userId: number, input: { kind: IdentityDataRequest["kind"]; request_id: string; notes?: string | null }): IdentityDataRequest {
    const request: IdentityDataRequest = {
      id: this.dataRequestSeq++,
      user_id: userId,
      kind: input.kind,
      status: "requested",
      request_id: input.request_id,
      notes: input.notes ?? null,
      created_at: nowIso(),
      completed_at: null,
    };
    this.dataRequests.push(request);
    return clone(request);
  }

  listDataRequests(userId: number): IdentityDataRequest[] {
    return this.dataRequests
      .filter((entry) => entry.user_id === userId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((entry) => clone(entry));
  }

  createDealerApplication(input: DealerApplicationCreateInput & {
    applicant_user_id: number | null;
    request_id: string;
    payload: JsonValue;
  }): DealerApplication {
    const duplicate = this.dealerApplications.find((entry) => {
      if (entry.status === "rejected") {
        return false;
      }
      return (
        entry.contact_email.toLowerCase() === input.contact_email.toLowerCase() &&
        entry.legal_name.toLowerCase() === input.legal_name.toLowerCase()
      );
    });
    if (duplicate) {
      throw new ConflictException("该邮箱或企业已存在待处理申请");
    }

    const id = this.dealerApplicationSeq++;
    const application: DealerApplication = {
      id,
      application_no: `DA-${String(id).padStart(6, "0")}`,
      applicant_user_id: input.applicant_user_id,
      company_id: null,
      legal_name: input.legal_name,
      display_name: input.display_name,
      country: input.country,
      website: input.website ?? null,
      business_type: input.business_type,
      tax_id: input.tax_id ?? null,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone ?? null,
      currency: input.currency,
      payload: clone(input.payload),
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      review_note: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    this.dealerApplications.push(application);
    return clone(application);
  }

  listDealerApplications(query: {
    status?: DealerApplicationStatus | undefined;
    country?: string | undefined;
    applicant_user_id?: number | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): { items: DealerApplication[]; page: number; page_size: number; total: number } {
    const filtered = this.dealerApplications.filter((entry) => {
      if (query.status && entry.status !== query.status) return false;
      if (query.country && entry.country !== query.country) return false;
      if (query.applicant_user_id && entry.applicant_user_id !== query.applicant_user_id) return false;
      return true;
    });

    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(start, start + pageSize)
        .map((entry) => clone(entry)),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  getDealerApplication(id: number): DealerApplication {
    const application = this.dealerApplications.find((entry) => entry.id === id);
    if (!application) {
      throw new NotFoundException("经销商申请不存在");
    }
    return clone(application);
  }

  submitDealerApplication(id: number, request_id: string, applicantUserId: number | null, note?: string) : DealerApplication {
    const index = this.dealerApplications.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("经销商申请不存在");
    }
    const current = this.dealerApplications[index]!;
    if (current.status === "approved") {
      throw new ConflictException("已通过的申请不能再次提交");
    }
    const next: DealerApplication = {
      ...current,
      applicant_user_id: current.applicant_user_id ?? applicantUserId,
      status: "submitted",
      submitted_at: nowIso(),
      review_note: note ?? current.review_note,
      updated_at: nowIso(),
    };
    this.dealerApplications[index] = next;
    if (next.applicant_user_id) {
      this.recordNotification({
        recipient_user_id: next.applicant_user_id,
        company_id: null,
        audience: "dealer",
        kind: "dealer.application.submitted",
        channel: "email",
        template_key: "dealer_application_submitted",
        request_id,
        payload: {
          application_id: next.id,
          application_no: next.application_no,
        },
        status: "sent",
      });
    }
    return clone(next);
  }

  reviewDealerApplication(
    id: number,
    input: DealerApplicationReviewInput,
    reviewerUserId: number,
    request_id: string,
  ): { application: DealerApplication; company: DealerCompany | null; member: DealerMember | null } {
    const index = this.dealerApplications.findIndex((entry) => entry.id === id);
    if (index < 0) {
      throw new NotFoundException("经销商申请不存在");
    }

    const current = this.dealerApplications[index]!;
    if (current.status === "approved" || current.status === "rejected") {
      throw new ConflictException("申请已处理");
    }

    const baseApplication: DealerApplication = {
      ...current,
      status: input.decision,
      reviewed_at: nowIso(),
      review_note: input.reason ?? null,
      updated_at: nowIso(),
    };

    let company: DealerCompany | null = null;
    let member: DealerMember | null = null;

    if (input.decision === "approved") {
      company = {
        id: this.dealerCompanySeq++,
        legal_name: baseApplication.legal_name,
        display_name: baseApplication.display_name,
        country: baseApplication.country,
        website: baseApplication.website,
        business_type: baseApplication.business_type,
        tax_id: baseApplication.tax_id,
        tier_id: input.tier_id ?? null,
        price_list_id: input.price_list_id ?? null,
        currency: baseApplication.currency,
        payment_terms: input.payment_terms ?? "Net 30",
        sales_territories: input.sales_territories ?? { countries: [baseApplication.country] },
        authorized_categories: input.authorized_categories ?? { ids: [] },
        sales_rep: input.sales_rep ?? null,
        public_listing: input.public_listing ?? true,
        status: "active",
        created_at: nowIso(),
        archived_at: null,
      };

      this.dealerCompanies.push(company);
      baseApplication.company_id = company.id;

      if (baseApplication.applicant_user_id) {
        member = {
          id: this.dealerMemberSeq++,
          company_id: company.id,
          user_id: baseApplication.applicant_user_id,
          role: "admin",
          permissions: ["dealer:read", "dealer:write", "dealer:company:read", "dealer:company:write"],
          status: "active",
          invited_at: null,
          joined_at: nowIso(),
        };
        this.dealerMembers.push(member);
      }
    }

    this.dealerApplications[index] = baseApplication;
    if (baseApplication.applicant_user_id) {
      this.recordNotification({
        recipient_user_id: baseApplication.applicant_user_id,
        company_id: company?.id ?? null,
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
          application_id: baseApplication.id,
          application_no: baseApplication.application_no,
          company_id: company?.id ?? null,
        },
        status: "sent",
      });
    }
    return {
      application: clone(baseApplication),
      company: company ? clone(company) : null,
      member: member ? clone(member) : null,
    };
  }

  listPublicDealerListings(query: {
    country?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): { items: DealerPublicListing[]; page: number; page_size: number; total: number } {
    const filtered = this.dealerCompanies.filter((entry) => {
      if (!entry.public_listing) return false;
      if (entry.status !== "active") return false;
      if (query.country && entry.country !== query.country) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(start, start + pageSize)
        .map((company) => ({
          company: clone(company),
          addresses: this.dealerAddressesForCompany(company.id),
        })),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  updateDealerCompany(companyId: number, patch: {
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
  }): DealerCompany {
    const index = this.dealerCompanies.findIndex((entry) => entry.id === companyId);
    if (index < 0) {
      throw new NotFoundException("经销商企业不存在");
    }
    const current = this.dealerCompanies[index]!;
    const next: DealerCompany = {
      ...current,
      legal_name: patch.legal_name ?? current.legal_name,
      display_name: patch.display_name ?? current.display_name,
      country: patch.country ?? current.country,
      website: patch.website !== undefined ? patch.website : current.website,
      business_type: patch.business_type ?? current.business_type,
      tax_id: patch.tax_id !== undefined ? patch.tax_id : current.tax_id,
      tier_id: patch.tier_id !== undefined ? patch.tier_id : current.tier_id,
      price_list_id: patch.price_list_id !== undefined ? patch.price_list_id : current.price_list_id,
      currency: patch.currency ?? current.currency,
      payment_terms: patch.payment_terms ?? current.payment_terms,
      sales_territories: patch.sales_territories ?? current.sales_territories,
      authorized_categories: patch.authorized_categories ?? current.authorized_categories,
      sales_rep: patch.sales_rep !== undefined ? patch.sales_rep : current.sales_rep,
      public_listing: patch.public_listing ?? current.public_listing,
      status: patch.status ?? current.status,
    };
    this.dealerCompanies[index] = next;
    return clone(next);
  }

  private dealerAddressesForCompany(companyId: number): DealerAddress[] {
    return this.addressesForDealerCompany(companyId).map((entry) => clone(entry));
  }

  private addressesForDealerCompany(companyId: number): DealerAddress[] {
    return this.dealerAddresses.filter((entry) => entry.company_id === companyId);
  }

  getDealerCompany(companyId: number): DealerCompany {
    return clone(this.getDealerCompanyById(companyId));
  }

  listDealerCompanies(query: {
    status?: DealerCompanyStatus | undefined;
    country?: string | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
  }): { items: DealerCompany[]; page: number; page_size: number; total: number } {
    const filtered = this.dealerCompanies.filter((entry) => {
      if (query.status && entry.status !== query.status) return false;
      if (query.country && entry.country !== query.country) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(start, start + pageSize)
        .map((entry) => clone(entry)),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  listDealerMembers(query: { company_id?: number | undefined; status?: DealerMemberStatus | undefined; page?: number | undefined; page_size?: number | undefined; }): { items: DealerMember[]; page: number; page_size: number; total: number } {
    const filtered = this.dealerMembers.filter((entry) => {
      if (query.company_id && entry.company_id !== query.company_id) return false;
      if (query.status && entry.status !== query.status) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.id - left.id)
        .slice(start, start + pageSize)
        .map((entry) => clone(entry)),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  listDealerAddresses(companyId: number): DealerAddress[] {
    return this.dealerAddresses
      .filter((entry) => entry.company_id === companyId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map((entry) => clone(entry));
  }

  addDealerAddress(
    companyId: number,
    input: {
      kind: string;
      payload: JsonValue;
      public_listing?: JsonValue | null | undefined;
    },
  ): DealerAddress {
    const company = this.getDealerCompanyById(companyId);
    if (company.status === "closed") {
      throw new ForbiddenException("企业已关闭，不能新增地址");
    }

    const address: DealerAddress = {
      id: this.addressSeq++,
      company_id: companyId,
      kind: input.kind,
      payload: clone(input.payload),
      public_listing: input.public_listing ?? null,
      created_at: nowIso(),
    };
    this.dealerAddresses.push(address);
    return clone(address);
  }

  inviteDealerMember(input: {
    company_id: number;
    user_id: number;
    role: string;
    permissions: PermissionCode[];
  }): DealerMember {
    const company = this.getDealerCompanyById(input.company_id);
    if (company.status !== "active") {
      throw new ForbiddenException("企业当前不可邀请成员");
    }
    const existingIndex = this.dealerMembers.findIndex(
      (entry) => entry.company_id === input.company_id && entry.user_id === input.user_id,
    );
    const member: DealerMember = {
      id: existingIndex >= 0 ? this.dealerMembers[existingIndex]!.id : this.dealerMemberSeq++,
      company_id: input.company_id,
      user_id: input.user_id,
      role: input.role,
      permissions: input.permissions,
      status: "active",
      invited_at: existingIndex >= 0 ? this.dealerMembers[existingIndex]!.invited_at : nowIso(),
      joined_at: nowIso(),
    };
    if (existingIndex >= 0) {
      this.dealerMembers[existingIndex] = member;
    } else {
      this.dealerMembers.push(member);
    }
    return clone(member);
  }

  setDealerCompanyStatus(companyId: number, status: DealerCompanyStatus): DealerCompany {
    return this.updateDealerCompany(companyId, { status });
  }

  getDealerContextForUser(userId: number): DealerContext | null {
    const company = this.getActiveDealerCompanyForUser(userId);
    if (!company) {
      return null;
    }

    const member = this.getDealerMemberForUser(userId);
    return {
      company_id: company.id,
      display_name: company.display_name,
      status: company.status,
      currency: company.currency,
      permissions: member?.permissions ?? [],
    };
  }

  listNotifications(query: { recipient_user_id?: number | undefined; company_id?: number | undefined; audience?: AccountAudience | undefined; status?: IdentityNotification["status"] | undefined; page?: number | undefined; page_size?: number | undefined; }): { items: IdentityNotification[]; page: number; page_size: number; total: number } {
    const filtered = this.notifications.filter((entry) => {
      if (query.recipient_user_id && entry.recipient_user_id !== query.recipient_user_id) return false;
      if (query.company_id && entry.company_id !== query.company_id) return false;
      if (query.audience && entry.audience !== query.audience) return false;
      if (query.status && entry.status !== query.status) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(start, start + pageSize)
        .map((entry) => clone(entry)),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  recordNotification(input: NotificationInput): IdentityNotification {
    const notification: IdentityNotification = {
      id: this.notificationSeq++,
      recipient_user_id: input.recipient_user_id,
      company_id: input.company_id,
      audience: input.audience,
      kind: input.kind,
      channel: input.channel,
      template_key: input.template_key,
      status: input.status ?? "queued",
      request_id: input.request_id,
      payload: clone(input.payload),
      failure_reason: input.failure_reason ?? null,
      created_at: nowIso(),
      sent_at: input.status === "sent" ? nowIso() : null,
    };
    this.notifications.push(notification);
    return clone(notification);
  }

  issueSession(userId: number, requestId: string): SessionRecord {
    const user = this.users[this.getUserIndexById(userId)]!;
    const company = this.getActiveDealerCompanyForUser(userId);
    if (user.audience === "dealer" && !company) {
      throw new ForbiddenException("经销商账号未绑定有效企业");
    }

    const session: SessionRecord = {
      id: this.sessionSeq++,
      token: randomUUID(),
      user_id: user.id,
      audience: user.audience,
      company_id: company?.id ?? null,
      permissions: this.permissionsForUser(user.id),
      expires_at: tokenToIsoHours(24 * 30),
      revoked_at: null,
      last_seen_at: nowIso(),
      created_at: nowIso(),
    };

    this.sessions.push(session);
    this.recordNotification({
      recipient_user_id: user.id,
      company_id: company?.id ?? null,
      audience: user.audience,
      kind: "account.session.created",
      channel: "email",
      template_key: "account_session_created",
      request_id: requestId,
      payload: { audience: user.audience, session_id: session.id },
      status: "sent",
    });

    return clone(session);
  }

  resolveActorFromToken(token: string): SessionActor | null {
    const session = this.sessions.find((entry) => entry.token === token);
    if (!session) {
      return null;
    }
    if (session.revoked_at) {
      return null;
    }
    if (session.expires_at < nowIso()) {
      return null;
    }

    const user = this.users.find((entry) => entry.id === session.user_id);
    if (!user || user.status !== "active") {
      return null;
    }

    if (session.audience === "dealer") {
      const company = session.company_id ? this.dealerCompanies.find((entry) => entry.id === session.company_id) : this.getActiveDealerCompanyForUser(user.id);
      if (!company || company.status !== "active") {
        return null;
      }
      const member = this.getDealerMemberForUser(user.id);
      return {
        user_id: user.id,
        audience: "dealer",
        company_id: company.id,
        permissions: member?.permissions ?? this.permissionsForUser(user.id),
      };
    }

    return {
      user_id: user.id,
      audience: user.audience,
      permissions: this.permissionsForUser(user.id),
    };
  }

  getSessionByToken(token: string): SessionRecord | null {
    const session = this.sessions.find((entry) => entry.token === token);
    return session ? clone(session) : null;
  }

  revokeSession(token: string): SessionRecord {
    const index = this.sessions.findIndex((entry) => entry.token === token);
    if (index < 0) {
      throw new NotFoundException("会话不存在");
    }
    const current = this.sessions[index]!;
    const next: SessionRecord = {
      ...current,
      revoked_at: nowIso(),
    };
    this.sessions[index] = next;
    return clone(next);
  }

  listSessions(query: { user_id?: number | undefined; audience?: AccountAudience | undefined; status?: "active" | "revoked" | "expired" | undefined; page?: number | undefined; page_size?: number | undefined; }): { items: SessionRecord[]; page: number; page_size: number; total: number } {
    const filtered = this.sessions.filter((entry) => {
      if (query.user_id && entry.user_id !== query.user_id) return false;
      if (query.audience && entry.audience !== query.audience) return false;
      if (query.status === "active" && (entry.revoked_at || entry.expires_at < nowIso())) return false;
      if (query.status === "revoked" && !entry.revoked_at) return false;
      if (query.status === "expired" && !(entry.expires_at < nowIso())) return false;
      return true;
    });
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;
    const start = (page - 1) * pageSize;
    return {
      items: filtered
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(start, start + pageSize)
        .map((entry) => clone(entry)),
      page,
      page_size: pageSize,
      total: filtered.length,
    };
  }

  toUser(user: StoredUser): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      audience: user.audience,
      status: user.status,
      verified_at: user.verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
