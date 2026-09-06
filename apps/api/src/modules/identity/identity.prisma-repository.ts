import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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

import { DATABASE_CLIENT } from "../../database/database.constants";
import {
  type CreateDataRequestInput,
  type CreateRoleInput,
  type IdentityNotificationListResult,
  type IdentityRepository,
  type IdentityUserListQuery,
  type IdentityUserListResult,
  type UpdateRoleInput,
} from "./identity.repository";

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

@Injectable()
export class IdentityPrismaRepository implements IdentityRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getUserById(id: number): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({
      where: { id },
    });

    return user ? this.mapUser(user) : null;
  }

  async updateProfile(userId: number, input: IdentityProfileUpdate): Promise<IdentityUser> {
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

  // addresses 表已删除：Demo 模式返回空列表
  async listAddresses(_userId: number): Promise<IdentityAddress[]> {
    return [];
  }

  async upsertAddress(_userId: number, _input: IdentityAddressCreateInput): Promise<IdentityAddress> {
    throw new Error("Demo模式：暂不支持地址本");
  }

  async createAddress(_userId: number, _input: IdentityAddressCreateInput): Promise<IdentityAddress> {
    throw new Error("Demo模式：暂不支持地址本");
  }

  // addresses 表已删除：Demo 模式空实现
  async deleteAddress(_userId: number, _addressId: number): Promise<void> {
    // 无 DB 写入
  }

  // subscriptions 表已删除：Demo 模式返回空列表
  async listSubscriptions(_userId: number): Promise<IdentitySubscription[]> {
    return [];
  }

  async upsertSubscription(
    _userId: number,
    _input: IdentitySubscriptionUpsertInput,
  ): Promise<IdentitySubscription> {
    throw new Error("Demo模式：暂不支持订阅偏好");
  }

  async listUsers(query: IdentityUserListQuery): Promise<IdentityUserListResult> {
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
      items: users.map(u => this.mapUser(u)),
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

  async updateUserStatus(userId: number, status: AccountStatus): Promise<IdentityUser> {
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
    return roles.map(r => this.mapRole(r));
  }

  async createRole(input: CreateRoleInput): Promise<IdentityRole> {
    // roles 表无 permissions 列，权限写入走 user_roles.overrides（见 setUserPermissions）
    const role = await this.database.role.create({
      data: {
        code: input.code,
        name: input.name,
        audience: input.audience,
      },
    });

    return this.mapRole(role);
  }

  async updateRole(roleId: number, input: UpdateRoleInput): Promise<IdentityRole> {
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
      "account:read", "account:write",
      "orders:read", "orders:write",
      "dealer:read", "dealer:write",
      "catalog:read", "catalog:write",
    ];
  }

  // data_requests 表已删除：Demo 模式不支持导出请求
  async createDataRequest(_userId: number, _input: CreateDataRequestInput): Promise<IdentityDataRequest> {
    throw new Error("Demo模式：暂不支持数据导出请求");
  }

  async listDataRequests(_userId: number): Promise<IdentityDataRequest[]> {
    return [];
  }

  // Demo：用户权限以 user_roles.overrides.permissions 持久化（无成员记录时仅返回权限视图）
  async setUserPermissions(userId: number, permissions: string[]): Promise<IdentityRole> {
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

  // notification_deliveries 表已删除：Demo 模式返回空分页
  async listNotifications(
    query: IdentityNotificationListQuery,
  ): Promise<IdentityNotificationListResult> {
    return {
      items: [],
      total: 0,
      page: query.page,
      page_size: query.page_size,
    };
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

  private mapRole(role: { id: number; code: string; name: string; audience: string }): IdentityRole {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      audience: role.audience as AccountAudience,
      // roles 表无 permissions 列，角色权限列表暂固定为空
      permissions: [],
    };
  }
}
