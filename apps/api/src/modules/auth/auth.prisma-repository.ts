import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";
import type {
  AuthLoginInput,
  AuthSession,
  AuthSessionListQuery,
  AuthVerifyEmailInput,
  IdentityNotification,
  IdentityUser,
  JsonValue,
} from "@wemo/contracts";

import {
  type AuthRepository,
  type AuthSessionListResult,
  type CreateUserInput,
  type RecordNotificationInput,
} from "./auth.repository";
import { DATABASE_CLIENT } from "../../database/database.constants";

function nowIso(): string {
  return new Date().toISOString();
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

/** sessions 表行的最小形状（无 relation，纯标量字段） */
interface SessionRow {
  id: number;
  userId: number;
  audience: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createUser(input: CreateUserInput): Promise<IdentityUser> {
    const user = await this.database.user.create({
      data: {
        email: input.email,
        passwordHash: `hashed_${input.password}`, // Demo only - use bcrypt in production
        name: input.name,
        audience: input.audience,
      },
    });

    return this.mapUser(user);
  }

  async getUserByEmail(email: string): Promise<IdentityUser | null> {
    const user = await this.database.user.findUnique({
      where: { email },
    });

    return user ? this.mapUser(user) : null;
  }

  async verifyEmail(input: AuthVerifyEmailInput): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { email: input.email },
      data: { verifiedAt: new Date() },
    });

    return this.mapUser(user);
  }

  async authenticate(input: AuthLoginInput): Promise<IdentityUser> {
    const user = await this.database.user.findFirst({
      where: {
        email: input.email,
        passwordHash: `hashed_${input.password}`, // Demo only
      },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    return this.mapUser(user);
  }

  async issueSession(userId: number, requestId: string): Promise<AuthSession> {
    const token = `session_${requestId}_${userId}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.database.session.create({
      data: {
        userId,
        audience: "user",
        token,
        expiresAt,
      },
    });

    return this.mapSession(session);
  }

  async listSessions(
    query: AuthSessionListQuery & { user_id: number },
  ): Promise<AuthSessionListResult> {
    const where: Record<string, unknown> = { userId: query.user_id };
    if (query.audience) where.audience = query.audience;
    if (query.status) {
      if (query.status === "active") {
        where.revokedAt = null;
        where.expiresAt = { gt: new Date() };
      } else if (query.status === "revoked") {
        where.revokedAt = { not: null };
      } else if (query.status === "expired") {
        where.revokedAt = null;
        where.expiresAt = { lte: new Date() };
      }
    }

    const [sessions, total] = await Promise.all([
      this.database.session.findMany({
        where,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
        orderBy: { createdAt: "desc" },
      }),
      this.database.session.count({ where }),
    ]);

    return {
      items: sessions.map(s => this.mapSession(s)),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getSessionByToken(token: string): Promise<AuthSession | null> {
    const session = await this.database.session.findUnique({
      where: { token },
    });

    return session ? this.mapSession(session) : null;
  }

  async revokeSession(token: string): Promise<AuthSession> {
    const session = await this.database.session.update({
      where: { token },
      data: { revokedAt: new Date() },
    });

    return this.mapSession(session);
  }

  // subscriptions 表已删除：Demo 模式空实现
  async upsertSubscription(
    _userId: number,
    _input: { channel: string; status: string; consent_at: string },
  ): Promise<void> {
    // 无 DB 写入
  }

  // notification_deliveries 表已删除：返回合成契约对象，无 DB 写入
  async recordNotification(input: RecordNotificationInput): Promise<IdentityNotification> {
    console.log(
      `[demo] notification queued: kind=${input.kind} recipient=${input.recipient_user_id ?? "-"} template=${input.template_key}`,
    );

    return {
      id: Date.now(),
      recipient_user_id: input.recipient_user_id,
      company_id: input.company_id,
      audience: input.audience as IdentityNotification["audience"],
      kind: input.kind,
      channel: input.channel,
      template_key: input.template_key,
      status: input.status as IdentityNotification["status"],
      request_id: input.request_id,
      payload: input.payload as JsonValue,
      failure_reason: null,
      created_at: nowIso(),
      sent_at: null,
    };
  }

  private mapUser(user: UserRow): IdentityUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      locale: user.locale,
      audience: user.audience as IdentityUser["audience"],
      status: user.status as IdentityUser["status"],
      verified_at: user.verifiedAt ? user.verifiedAt.toISOString() : null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }

  private mapSession(session: SessionRow): AuthSession {
    return {
      id: session.id,
      token: session.token,
      user_id: session.userId,
      audience: session.audience as AuthSession["audience"],
      // sessions 表不存企业与权限快照，Demo 下收口为 null/空数组
      company_id: null,
      permissions: [],
      expires_at: session.expiresAt.toISOString(),
      revoked_at: session.revokedAt ? session.revokedAt.toISOString() : null,
      last_seen_at: session.createdAt.toISOString(),
      created_at: session.createdAt.toISOString(),
    };
  }
}
