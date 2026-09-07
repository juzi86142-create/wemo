import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Redis } from "ioredis";
import type { DatabaseClient } from "@wemo/database";
import type {
  AccountAudience,
  AuthLoginInput,
  AuthSession,
  AuthSessionListQuery,
  AuthVerifyEmailInput,
  IdentityUser,
} from "@wemo/contracts";
import { randomBytes } from "node:crypto";

import {
  type AuthRepository,
  type AuthSessionListResult,
  type CreateUserInput,
  type RevokeOthersResult,
} from "./auth.repository";
import { hashPassword, verifyPassword } from "./password";
import { DATABASE_CLIENT } from "../../database/database.constants";
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from "../../database/redis.constants";
import {
  readHashOne,
  redisNextId,
  writeHashObject,
} from "../../runtime/redis-hash";
import { nowIso } from "../../runtime/time";

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

const SESSION_TTL_DAYS = 7;

/** 邮箱验证令牌的 Redis hash 键 value 形状 */
interface VerificationEntry {
  token: string;
  user_id: number;
}

/** 注册登录与会话持久化在 PostgreSQL 邮箱验证令牌与通知投递持久化在 Redis */
@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly database: DatabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async createUser(input: CreateUserInput): Promise<IdentityUser> {
    const user = await this.database.user.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
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
    const userId = await this.consumeEmailVerificationToken(
      input.email,
      input.token,
    );
    if (userId === null) {
      throw new UnauthorizedException("邮箱验证令牌无效或已过期");
    }

    const user = await this.database.user.update({
      where: { id: userId },
      data: { verifiedAt: new Date(), status: "active" },
    });

    return this.mapUser(user);
  }

  async authenticate(input: AuthLoginInput): Promise<IdentityUser> {
    const user = await this.database.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("邮箱或密码不正确");
    }
    if (user.status === "suspended" || user.status === "closed") {
      throw new ForbiddenException("账户已停用或关闭");
    }

    return this.mapUser(user);
  }

  async issueSession(
    userId: number,
    audience: AccountAudience,
  ): Promise<AuthSession> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const session = await this.database.session.create({
      data: {
        userId,
        audience,
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
      items: sessions.map((s) => this.mapSession(s)),
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

  async revokeOtherSessions(
    userId: number,
    currentToken: string,
  ): Promise<RevokeOthersResult> {
    const otherSessions = await this.database.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        token: { not: currentToken },
      },
    });

    if (otherSessions.length > 0) {
      await this.database.session.updateMany({
        where: { id: { in: otherSessions.map((s) => s.id) } },
        data: { revokedAt: new Date() },
      });
    }

    const remaining = await this.database.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    return {
      revoked_count: otherSessions.length,
      remaining: remaining.map((s) => this.mapSession(s)),
    };
  }

  async storeEmailVerificationToken(
    email: string,
    token: string,
    userId: number,
  ): Promise<void> {
    const entry: VerificationEntry = { token, user_id: userId };
    await writeHashObject(
      this.redis,
      `${REDIS_KEY_PREFIX}:verifications`,
      email,
      entry,
    );
  }

  async consumeEmailVerificationToken(
    email: string,
    token: string,
  ): Promise<number | null> {
    const entry = await readHashOne<VerificationEntry>(
      this.redis,
      `${REDIS_KEY_PREFIX}:verifications`,
      email,
      (raw) => JSON.parse(raw) as VerificationEntry,
    );
    if (!entry || entry.token !== token) {
      return null;
    }
    await this.redis.hdel(`${REDIS_KEY_PREFIX}:verifications`, email);
    return entry.user_id;
  }

  async storePasswordResetToken(
    email: string,
    token: string,
    userId: number,
  ): Promise<void> {
    const entry: VerificationEntry = { token, user_id: userId };
    await writeHashObject(
      this.redis,
      `${REDIS_KEY_PREFIX}:password-resets`,
      email,
      entry,
    );
  }

  async consumePasswordResetToken(
    email: string,
    token: string,
  ): Promise<number | null> {
    const entry = await readHashOne<VerificationEntry>(
      this.redis,
      `${REDIS_KEY_PREFIX}:password-resets`,
      email,
      (raw) => JSON.parse(raw) as VerificationEntry,
    );
    if (!entry || entry.token !== token) {
      return null;
    }
    await this.redis.hdel(`${REDIS_KEY_PREFIX}:password-resets`, email);
    return entry.user_id;
  }

  async resetPassword(
    userId: number,
    newPassword: string,
  ): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return this.mapUser(user);
  }

  async storeMfaChallenge(
    token: string,
    challenge: { user_id: number; code: string; expires_at: string },
  ): Promise<void> {
    await writeHashObject(
      this.redis,
      `${REDIS_KEY_PREFIX}:mfa:challenges`,
      token,
      challenge,
    );
  }

  async consumeMfaChallenge(token: string, code: string): Promise<number | null> {
    const challenge = await readHashOne<{
      user_id: number;
      code: string;
      expires_at: string;
    }>(
      this.redis,
      `${REDIS_KEY_PREFIX}:mfa:challenges`,
      token,
      (raw) =>
        JSON.parse(raw) as {
          user_id: number;
          code: string;
          expires_at: string;
        },
    );
    if (!challenge || challenge.code !== code) {
      return null;
    }
    if (new Date(challenge.expires_at) < new Date()) {
      return null;
    }
    await this.redis.hdel(`${REDIS_KEY_PREFIX}:mfa:challenges`, token);
    return challenge.user_id;
  }

  async changePassword(
    userId: number,
    newPassword: string,
  ): Promise<IdentityUser> {
    const user = await this.database.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return this.mapUser(user);
  }

  async getPasswordHash(userId: number): Promise<string | null> {
    const user = await this.database.user.findUnique({
      where: { id: userId },
    });
    return user?.passwordHash ?? null;
  }

  async getActiveDealerMembership(
    userId: number,
  ): Promise<{ company_id: number; role: string } | null> {
    const member = await this.database.dealerMember.findFirst({
      where: { userId, status: "active" },
    });
    if (!member) {
      return null;
    }
    const company = await this.database.dealerCompany.findUnique({
      where: { id: member.companyId },
    });
    if (!company || company.status !== "active") {
      return null;
    }
    return { company_id: member.companyId, role: member.role };
  }

  async upsertSubscription(
    userId: number,
    input: { channel: string; status: string; consent_at: string },
  ): Promise<void> {
    const key = `${REDIS_KEY_PREFIX}:user:${userId}:subscriptions`;
    const existing = await readHashOne<Record<string, unknown>>(
      this.redis,
      key,
      input.channel,
      (raw) => JSON.parse(raw) as Record<string, unknown>,
    );
    const now = nowIso();
    const subscription = existing
      ? {
          ...existing,
          status: input.status,
          consent_at: input.consent_at,
        }
      : {
          id: await redisNextId(
            this.redis,
            `${REDIS_KEY_PREFIX}:user:${userId}:subscriptions:next`,
          ),
          user_id: userId,
          channel: input.channel,
          status: input.status,
          consent_at: input.consent_at,
          created_at: now,
        };
    await writeHashObject(this.redis, key, input.channel, subscription);
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
      company_id: null,
      permissions: [],
      expires_at: session.expiresAt.toISOString(),
      revoked_at: session.revokedAt ? session.revokedAt.toISOString() : null,
      last_seen_at: session.createdAt.toISOString(),
      created_at: session.createdAt.toISOString(),
    };
  }
}
