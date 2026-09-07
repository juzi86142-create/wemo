import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type { SessionActor } from "@wemo/contracts";

import { DATABASE_CLIENT } from "../../database/database.constants";

/** 服务端会话解析 依据令牌从 PostgreSQL 还原 actor 不信任任何客户端身份头 */
@Injectable()
export class SessionActorResolver {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async resolve(token: string): Promise<SessionActor | null> {
    const session = await this.database.session.findUnique({
      where: { token },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return null;
    }

    const user = await this.database.user.findUnique({
      where: { id: session.userId },
    });
    if (!user || user.status === "suspended" || user.status === "closed") {
      return null;
    }

    if (user.audience === "dealer") {
      const membership = await this.database.dealerMember.findFirst({
        where: { userId: user.id, status: "active" },
      });
      if (!membership) {
        return null;
      }
      const company = await this.database.dealerCompany.findUnique({
        where: { id: membership.companyId },
      });
      if (!company || company.status !== "active") {
        return null;
      }

      return {
        user_id: user.id,
        audience: "dealer",
        company_id: membership.companyId,
        permissions: (membership.permissions ?? []) as string[],
      };
    }

    if (user.audience === "staff") {
      const memberships = await this.database.userRole.findMany({
        where: { userId: user.id },
      });
      const roles = await this.database.role.findMany({
        where: { id: { in: memberships.map((m) => m.roleId) } },
      });
      const permissions = new Set<string>();
      for (const membership of memberships) {
        const role = roles.find((r) => r.id === membership.roleId);
        for (const permission of (role?.permissions ?? []) as string[]) {
          permissions.add(permission);
        }
      }
      const overrides = memberships.map((m) => m.overrides as {
        permissions?: string[];
      });
      const overrideList = overrides
        .flatMap((o) => o.permissions ?? [])
        .filter((p): p is string => typeof p === "string");
      if (overrideList.length > 0) {
        return {
          user_id: user.id,
          audience: "staff",
          permissions: [...new Set(overrideList)],
        };
      }

      return {
        user_id: user.id,
        audience: "staff",
        permissions: [...permissions],
      };
    }

    return {
      user_id: user.id,
      audience: "user",
      permissions: [],
    };
  }
}
