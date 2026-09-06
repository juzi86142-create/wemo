import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@wemo/database";

import { AUTH_REPOSITORY, type AuthRepository } from "./auth.repository";
import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthSession,
  AuthSessionListQuery,
  AuthSessionListResponse,
  AuthVerifyEmailInput,
  IdentityNotificationMutationResponse,
} from "@wemo/contracts";

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class AuthPrismaRepository implements AuthRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createUser(input: AuthRegisterInput): Promise<{ id: number; email: string; name: string; audience: string; verified: boolean }> {
    const user = await this.database.user.create({
      data: {
        email: input.email,
        passwordHash: `hashed_${input.password}`, // Demo only - use bcrypt in production
        name: input.name,
        audience: input.audience,
      },
      select: { id: true, email: true, name: true, audience: true, verifiedAt: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      audience: user.audience,
      verified: !!user.verifiedAt,
    };
  }

  async getUserByEmail(email: string): Promise<{ id: number; email: string; name: string; audience: string; verified: boolean; passwordHash: string } | null> {
    const user = await this.database.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, audience: true, verifiedAt: true, passwordHash: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      audience: user.audience,
      verified: !!user.verifiedAt,
      passwordHash: user.passwordHash,
    };
  }

  async verifyEmail(input: { email: string }): Promise<{ id: number; email: string; name: string; audience: string; verified: boolean }> {
    const user = await this.database.user.update({
      where: { email: input.email },
      data: { verifiedAt: new Date() },
      select: { id: true, email: true, name: true, audience: true, verifiedAt: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      audience: user.audience,
      verified: !!user.verifiedAt,
    };
  }

  async authenticate(input: AuthLoginInput): Promise<{ id: number; email: string; name: string; audience: string }> {
    const user = await this.database.user.findFirst({
      where: {
        email: input.email,
        passwordHash: `hashed_${input.password}`, // Demo only
      },
      select: { id: true, email: true, name: true, audience: true },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    return user;
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
      select: { id: true, userId: true, token: true, expiresAt: true, createdAt: true, revokedAt: true },
    });

    return {
      id: session.id,
      user_id: session.userId,
      token: session.token,
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
      revoked_at: session.revokedAt?.toISOString() || null,
    };
  }

  async listSessions(query: AuthSessionListQuery): Promise<AuthSessionListResponse> {
    const where: any = { userId: query.user_id };
    if (query.audience) where.audience = query.audience;
    if (query.status) {
      if (query.status === "active") {
        where.revokedAt = null;
        where.expiresAt = { gt: new Date() };
      } else if (query.status === "revoked") {
        where.revokedAt = { not: null };
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
      items: sessions.map(s => ({
        id: s.id,
        user_id: s.userId,
        token: s.token,
        expires_at: s.expiresAt.toISOString(),
        created_at: s.createdAt.toISOString(),
        revoked_at: s.revokedAt?.toISOString() || null,
      })),
      total,
      page: query.page,
      page_size: query.page_size,
    };
  }

  async getSessionByToken(token: string): Promise<AuthSession | null> {
    const session = await this.database.session.findUnique({
      where: { token },
    });

    if (!session) return null;

    return {
      id: session.id,
      user_id: session.userId,
      token: session.token,
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
      revoked_at: session.revokedAt?.toISOString() || null,
    };
  }

  async revokeSession(token: string): Promise<AuthSession> {
    const session = await this.database.session.update({
      where: { token },
      data: { revokedAt: new Date() },
      select: { id: true, userId: true, token: true, expiresAt: true, createdAt: true, revokedAt: true },
    });

    return {
      id: session.id,
      user_id: session.userId,
      token: session.token,
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
      revoked_at: session.revokedAt?.toISOString() || null,
    };
  }

  async upsertSubscription(userId: number, input: { channel: string; status: string; consent_at: string }): Promise<void> {
    await this.database.subscription.upsert({
      where: { userId_channel: { userId, channel: input.channel } },
      create: {
        userId,
        channel: input.channel,
        status: input.status,
        consentAt: new Date(input.consent_at),
      },
      update: {
        status: input.status,
        consentAt: new Date(input.consent_at),
      },
    });
  }

  async recordNotification(input: { recipient_user_id: number | null; company_id: number | null; audience: string; kind: string; channel: string; template_key: string; request_id: string; payload: unknown; status: string }): Promise<{ id: number; kind: string }> {
    const notification = await this.database.notificationDelivery.create({
      data: {
        userId: input.recipient_user_id,
        companyId: input.company_id,
        templateKey: input.template_key,
        channel: input.channel,
        status: input.status as any,
        payload: input.payload as any,
        sentAt: input.status === "sent" ? new Date() : null,
      },
      select: { id: true, templateKey: true },
    });

    return { id: notification.id, kind: notification.templateKey };
  }
}
