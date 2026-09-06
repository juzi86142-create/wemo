import { Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { IDENTITY_REPOSITORY, type IdentityRepository } from "./identity.repository";
import type { IdentityUser, IdentityAddress, IdentitySubscription, IdentityRole, IdentityDataRequest } from "@wemo/contracts";

@Injectable()
export class IdentityPrismaRepository implements IdentityRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getUserById(id: number): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        addresses: true,
        subscriptions: true,
      },
    });

    return user ? this.mapUser(user) : null;
  }

  async updateProfile(userId: number, input: any): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phone: input.phone,
        locale: input.locale,
      },
      include: {
        roles: { include: { role: true } },
        addresses: true,
        subscriptions: true,
      },
    });

    return this.mapUser(user);
  }

  async listAddresses(userId: number): Promise<IdentityAddress[]> {
    const addresses = await this.database.address.findMany({
      where: { userId },
    });

    return addresses.map(a => ({
      id: a.id,
      user_id: a.userId,
      label: a.kind,
      address: a.payload,
      city: a.payload?.city,
      created_at: a.createdAt.toISOString(),
    }));
  }

  async upsertAddress(userId: number, input: any): Promise<IdentityAddress> {
    const address = await this.database.address.upsert({
      where: { id: input.id ?? 0 },
      create: {
        userId,
        kind: input.label,
        payload: input,
      },
      update: {
        kind: input.label,
        payload: input,
      },
    });

    return {
      id: address.id,
      user_id: address.userId,
      label: address.kind,
      address: address.payload,
      city: address.payload?.city,
      created_at: address.createdAt.toISOString(),
    };
  }

  async deleteAddress(userId: number, addressId: number): Promise<void> {
    await this.database.address.deleteMany({
      where: { id: addressId, userId },
    });
  }

  async listSubscriptions(userId: number): Promise<IdentitySubscription[]> {
    const subscriptions = await this.database.subscription.findMany({
      where: { userId },
    });

    return subscriptions.map(s => ({
      id: s.id,
      user_id: s.userId,
      channel: s.channel,
      status: s.status,
      consent_at: s.consentAt?.toISOString() || null,
      created_at: s.createdAt.toISOString(),
    }));
  }

  async upsertSubscription(userId: number, input: any): Promise<IdentitySubscription> {
    const subscription = await this.database.subscription.upsert({
      where: { userId_channel: { userId, channel: input.channel } },
      create: {
        userId,
        channel: input.channel,
        status: input.status,
        consentAt: input.consent_at ? new Date(input.consent_at) : null,
      },
      update: {
        status: input.status,
        consentAt: input.consent_at ? new Date(input.consent_at) : undefined,
      },
    });

    return {
      id: subscription.id,
      user_id: subscription.userId,
      channel: subscription.channel,
      status: subscription.status,
      consent_at: subscription.consentAt?.toISOString() || null,
      created_at: subscription.createdAt.toISOString(),
    };
  }

  async listUsers(query: any): Promise<{ items: IdentityUser[]; total: number; page: number; page_size: number }> {
    const where: any = {};
    if (query.email) where.email = { contains: query.email };
    if (query.status) where.status = query.status;
    if (query.audience) where.audience = query.audience;

    const [users, total] = await Promise.all([
      this.database.user.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        include: {
          roles: { include: { role: true } },
        },
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
      include: {
        roles: { include: { role: true } },
        addresses: true,
        subscriptions: true,
      },
    });

    return user ? this.mapUser(user) : null;
  }

  async updateUserStatus(userId: number, status: string): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: { status },
      include: {
        roles: { include: { role: true } },
      },
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
    return roles.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      audience: r.audience,
      permissions: [],
    }));
  }

  async createRole(input: any): Promise<IdentityRole> {
    const role = await this.database.role.create({
      data: {
        code: input.code,
        name: input.name,
        audience: input.audience,
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      audience: role.audience,
      permissions: [],
    };
  }

  async updateRole(roleId: number, input: any): Promise<IdentityRole> {
    const role = await this.database.role.update({
      where: { id: roleId },
      data: {
        name: input.name,
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      audience: role.audience,
      permissions: [],
    };
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

  async createDataRequest(userId: number, input: any): Promise<IdentityDataRequest> {
    const request = await this.database.dataRequest.create({
      data: {
        userId,
        type: input.type,
        status: "pending",
      },
    });

    return {
      id: request.id,
      user_id: request.userId,
      type: request.type,
      status: request.status,
      created_at: request.createdAt.toISOString(),
    };
  }

  async listDataRequests(userId: number): Promise<IdentityDataRequest[]> {
    const requests = await this.database.dataRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return requests.map(r => ({
      id: r.id,
      user_id: r.userId,
      type: r.type,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async getDealerContextForUser(userId: number): Promise<{ company_id: number } | null> {
    const member = await this.database.dealerMember.findFirst({
      where: { userId, status: "active" },
    });

    return member ? { company_id: member.companyId } : null;
  }

  async listNotifications(query: { user_id: number; page: number; page_size: number }): Promise<{ items: IdentityNotification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      this.database.notificationDelivery.findMany({
        where: { userId: query.user_id },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.notificationDelivery.count({ where: { userId: query.user_id } }),
    ]);

    return {
      items: notifications.map(n => ({
        id: n.id,
        user_id: n.userId,
        kind: n.templateKey,
        status: n.status,
        sent_at: n.sentAt?.toISOString() || null,
        created_at: n.createdAt.toISOString(),
      })),
      total,
    };
  }

  private mapUser(user: any): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      audience: user.audience,
      status: user.status,
      verified: !!user.verifiedAt,
      created_at: user.createdAt.toISOString(),
    };
  }
}
