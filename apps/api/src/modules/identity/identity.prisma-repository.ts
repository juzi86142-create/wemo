import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";
import type {
  AccountAudience,
  AccountStatus,
  DealerContext,
  IdentityAddress,
  IdentityAddressCreateInput,
  IdentityDataRequest,
  IdentityNotification,
  IdentityNotificationListQuery,
  IdentityProfileUpdate,
  IdentityRole,
  IdentitySubscription,
  IdentitySubscriptionUpsertInput,
  IdentityUser,
} from "@wemo/contracts";
import { randomUUID } from "node:crypto";

import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import { paginate } from "../../runtime/pagination";
import {
  readHashAll,
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";
import {
  type CreateDataRequestInput,
  type CreateRoleInput,
  type IdentityNotificationListResult,
  type IdentityRepository,
  type IdentityUserListQuery,
  type IdentityUserListResult,
  type UpdateRoleInput,
} from "./identity.repository";

function userAddressesKey(userId: number): string {
  return `${REDIS_KEY_PREFIX}:user:${userId}:addresses`;
}

function userSubscriptionsKey(userId: number): string {
  return `${REDIS_KEY_PREFIX}:user:${userId}:subscriptions`;
}

function userDataRequestsKey(userId: number): string {
  return `${REDIS_KEY_PREFIX}:user:${userId}:data-requests`;
}

function notificationDeliveriesKey(): string {
  return `${REDIS_KEY_PREFIX}:notifications:deliveries`;
}

/** users 表行的最小形状（无 relation，纯标量字段） */
interface UserRow {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  locale: string;
  audience: string;
  status: string;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 用户账号与角色持久化在 PostgreSQL 地址 订阅 数据请求 通知持久化在 Redis */
@Injectable()
export class IdentityPrismaRepository implements IdentityRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getUserById(id: number): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({
      where: { id },
    });

    return user ? this.mapUser(user) : null;
  }

  async updateProfile(
    userId: number,
    input: IdentityProfileUpdate,
  ): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
      },
    });

    return this.mapUser(user);
  }

  async listAddresses(userId: number): Promise<IdentityAddress[]> {
    const addresses = await readHashAll<IdentityAddress>(
      this.redis,
      userAddressesKey(userId),
      (raw) => JSON.parse(raw) as IdentityAddress,
    );
    return addresses.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async upsertAddress(
    userId: number,
    input: IdentityAddressCreateInput,
  ): Promise<IdentityAddress> {
    const now = new Date().toISOString();
    const address: IdentityAddress = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:user:${userId}:addresses:next`,
      ),
      user_id: userId,
      kind: input.kind,
      payload: input.payload,
      created_at: now,
    };
    await writeHashObject(
      this.redis,
      userAddressesKey(userId),
      address.id,
      address,
    );
    return address;
  }

  async createAddress(
    userId: number,
    input: IdentityAddressCreateInput,
  ): Promise<IdentityAddress> {
    return this.upsertAddress(userId, input);
  }

  async deleteAddress(userId: number, addressId: number): Promise<void> {
    await this.redis.hdel(userAddressesKey(userId), String(addressId));
  }

  async listSubscriptions(userId: number): Promise<IdentitySubscription[]> {
    const subscriptions = await readHashAll<IdentitySubscription>(
      this.redis,
      userSubscriptionsKey(userId),
      (raw) => JSON.parse(raw) as IdentitySubscription,
    );
    return subscriptions.sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }

  async upsertSubscription(
    userId: number,
    input: IdentitySubscriptionUpsertInput,
  ): Promise<IdentitySubscription> {
    const existing = await readHashOne<IdentitySubscription>(
      this.redis,
      userSubscriptionsKey(userId),
      input.channel,
      (raw) => JSON.parse(raw) as IdentitySubscription,
    );
    const now = new Date().toISOString();
    const subscription: IdentitySubscription = existing
      ? {
          ...existing,
          status: input.status,
          consent_at: input.consent_at ?? now,
        }
      : {
          id: await redisNextId(
            this.redis,
            `${REDIS_KEY_PREFIX}:user:${userId}:subscriptions:next`,
          ),
          user_id: userId,
          channel: input.channel,
          status: input.status,
          consent_at: input.consent_at ?? now,
          created_at: now,
        };
    await writeHashObject(
      this.redis,
      userSubscriptionsKey(userId),
      input.channel,
      subscription,
    );
    return subscription;
  }

  async listUsers(
    query: IdentityUserListQuery,
  ): Promise<IdentityUserListResult> {
    const where: Record<string, unknown> = {};
    if (query.email) where.email = { contains: query.email };
    if (query.status) where.status = query.status;
    if (query.audience) where.audience = query.audience;

    const [users, total] = await Promise.all([
      this.database.user.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.user.count({ where }),
    ]);

    return {
      items: users.map((u) => this.mapUser(u)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getUserByEmail(email: string): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({
      where: { email },
    });

    return user ? this.mapUser(user) : null;
  }

  async updateUserStatus(
    userId: number,
    status: AccountStatus,
  ): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: { status },
    });

    return this.mapUser(user);
  }

  async assignRole(userId: number, roleId: number): Promise<void> {
    await this.database.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, overrides: {} },
      update: {},
    });
  }

  async listRoles(): Promise<IdentityRole[]> {
    const roles = await this.database.role.findMany();
    return roles.map((r) => this.mapRole(r));
  }

  async createRole(input: CreateRoleInput): Promise<IdentityRole> {
    const role = await this.database.role.create({
      data: {
        code: input.code,
        name: input.name,
        audience: input.audience,
      },
    });

    return this.mapRole(role);
  }

  async updateRole(
    roleId: number,
    input: UpdateRoleInput,
  ): Promise<IdentityRole> {
    const role = await this.database.role.update({
      where: { id: roleId },
      data: input.name !== undefined ? { name: input.name } : {},
    });

    return this.mapRole(role);
  }

  async deleteRole(roleId: number): Promise<void> {
    await this.database.role.delete({ where: { id: roleId } });
  }

  async listPermissions(): Promise<string[]> {
    return [
      "account:read",
      "account:write",
      "orders:read",
      "orders:write",
      "dealer:read",
      "dealer:write",
      "catalog:read",
      "catalog:write",
    ];
  }

  async createDataRequest(
    userId: number,
    input: CreateDataRequestInput,
  ): Promise<IdentityDataRequest> {
    const now = new Date().toISOString();
    const request: IdentityDataRequest = {
      id: await redisNextId(
        this.redis,
        `${REDIS_KEY_PREFIX}:user:${userId}:data-requests:next`,
      ),
      user_id: userId,
      kind: input.kind,
      status: "requested",
      request_id: input.request_id || randomUUID(),
      notes: input.notes,
      created_at: now,
      completed_at: null,
    };
    await writeHashObject(
      this.redis,
      userDataRequestsKey(userId),
      request.id,
      request,
    );
    return request;
  }

  async listDataRequests(userId: number): Promise<IdentityDataRequest[]> {
    const requests = await readHashAll<IdentityDataRequest>(
      this.redis,
      userDataRequestsKey(userId),
      (raw) => JSON.parse(raw) as IdentityDataRequest,
    );
    return requests.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async setUserPermissions(
    userId: number,
    permissions: string[],
  ): Promise<IdentityRole> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const membership = await this.database.userRole.findFirst({
      where: { userId },
      orderBy: { id: "asc" },
    });

    if (membership) {
      await this.database.userRole.update({
        where: { id: membership.id },
        data: { overrides: { permissions } },
      });
    }

    return {
      id: user.id,
      code: "user_permissions",
      name: user.name,
      audience: user.audience as AccountAudience,
      permissions,
    };
  }

  async getDealerContextForUser(userId: number): Promise<DealerContext | null> {
    const member = await this.database.dealerMember.findFirst({
      where: { userId, status: "active" },
    });
    if (!member) {
      return null;
    }

    const company = await this.database.dealerCompany.findUnique({
      where: { id: member.companyId },
    });
    if (!company) {
      return null;
    }

    return {
      company_id: company.id,
      display_name: company.displayName,
      status: company.status as DealerContext["status"],
      currency: company.currency,
      permissions: Array.isArray(member.permissions)
        ? (member.permissions as string[])
        : [],
    };
  }

  async listNotifications(
    query: IdentityNotificationListQuery,
  ): Promise<IdentityNotificationListResult> {
    const items = await readHashAll<IdentityNotification>(
      this.redis,
      notificationDeliveriesKey(),
      (raw) => JSON.parse(raw) as IdentityNotification,
    );
    return paginate(items, query, {
      exact: {
        recipient_user_id: query.recipient_user_id,
        company_id: query.company_id,
        audience: query.audience,
        status: query.status,
      },
      sortBy: (a, b) => b.created_at.localeCompare(a.created_at),
    });
  }

  private mapUser(user: UserRow): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      audience: user.audience as AccountAudience,
      status: user.status as AccountStatus,
      verified_at: user.verifiedAt ? user.verifiedAt.toISOString() : null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }

  private mapRole(role: {
    id: number;
    code: string;
    name: string;
    audience: string;
  }): IdentityRole {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      audience: role.audience as AccountAudience,

      permissions: [],
    };
  }
}
