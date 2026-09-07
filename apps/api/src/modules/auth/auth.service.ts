import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AuthForgotPasswordSchema,
  AuthLoginSchema,
  AuthMfaChallengeResponseSchema,
  AuthMfaVerifySchema,
  AuthPasswordChangeSchema,
  AuthPasswordResetSchema,
  AuthRegisterSchema,
  AuthRevokeOthersResponseSchema,
  AuthSessionListQuerySchema,
  AuthSessionListResponseSchema,
  AuthSessionMutationResponseSchema,
  AuthSessionRevokeSchema,
  AuthVerifyEmailSchema,
  IdentityUserMutationResponseSchema,
} from "@wemo/contracts/identity";
import { NotificationDeliveryMutationResponseSchema } from "@wemo/contracts/content";
import { randomBytes } from "node:crypto";

import { AuthorizationService } from "../../runtime/authorization.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuthPrismaRepository } from "./auth.prisma-repository";
import { AUTH_REPOSITORY } from "./auth.repository";
import { verifyPassword } from "./password";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

import { nowIso } from "../../runtime/time";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthPrismaRepository,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  async register(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthRegisterSchema, body);
    if (input.audience !== "user") {
      throw new ForbiddenException("当前注册接口仅支持普通用户");
    }

    const item = await this.repository.createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      audience: "user",
    });

    const verificationToken = randomBytes(24).toString("hex");
    await this.repository.storeEmailVerificationToken(
      input.email,
      verificationToken,
      item.id,
    );

    if (input.agree_marketing) {
      await this.repository.upsertSubscription(item.id, {
        channel: "newsletter",
        status: "active",
        consent_at: nowIso(),
      });
    }

    await this.notifications.emitBusinessNotification({
      template_code: "account_email_verification",
      recipient_user_id: item.id,
      company_id: null,
      audience: item.audience,
      channel: "email",
      request_id: context.request_id,
      payload: { email: item.email, token: verificationToken },
    });

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async verifyEmail(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthVerifyEmailSchema, body);
    const item = await this.repository.verifyEmail(input);

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async login(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthLoginSchema, body);
    const user = await this.repository.authenticate(input);
    if (user.audience === "dealer") {
      const member = await this.repository.getActiveDealerMembership(user.id);
      if (!member) {
        throw new ForbiddenException("经销商企业停用或成员关系已失效");
      }
    }
    // 后台员工强制 MFA 两步登录 需求 SEC-002/2.3
    if (user.audience === "staff") {
      const challengeToken = randomBytes(24).toString("hex");
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await this.repository.storeMfaChallenge(challengeToken, {
        user_id: user.id,
        code,
        expires_at: expiresAt,
      });
      await this.notifications.emitBusinessNotification({
        template_code: "account_mfa_challenge",
        recipient_user_id: user.id,
        company_id: null,
        audience: "staff",
        channel: "email",
        request_id: context.request_id,
        payload: { email: user.email, code, expires_at: expiresAt },
      });

      return AuthMfaChallengeResponseSchema.parse({
        request_id: context.request_id,
        item: {
          mfa_required: true,
          challenge_token: challengeToken,
          expires_at: expiresAt,
        },
      });
    }
    const item = await this.repository.issueSession(user.id, user.audience);

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async verifyMfa(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthMfaVerifySchema, body);
    const userId = await this.repository.consumeMfaChallenge(
      input.challenge_token,
      input.code,
    );
    if (userId === null) {
      throw new UnauthorizedException("验证码无效或已过期");
    }
    const item = await this.repository.issueSession(userId, "staff");

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async forgotPassword(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthForgotPasswordSchema, body);
    const user = await this.repository.getUserByEmail(input.email);
    const resetToken = user ? randomBytes(24).toString("hex") : null;
    if (user && resetToken) {
      await this.repository.storePasswordResetToken(
        input.email,
        resetToken,
        user.id,
      );
    }
    const item = await this.notifications.emitBusinessNotification({
      template_code: "account_password_reset",
      recipient_user_id: user?.id ?? null,
      company_id: null,
      audience: user?.audience ?? "user",
      channel: "email",
      request_id: context.request_id,
      payload: { email: input.email, token: resetToken, accepted: true },
    });

    return NotificationDeliveryMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async resetPassword(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthPasswordResetSchema, body);
    const userId = await this.repository.consumePasswordResetToken(
      input.email,
      input.token,
    );
    if (userId === null) {
      throw new UnauthorizedException("密码重置令牌无效或已过期");
    }
    const item = await this.repository.resetPassword(userId, input.new_password);

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async changePassword(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthPasswordChangeSchema, body);
    const passwordHash = await this.repository.getPasswordHash(actor.user_id);
    if (!passwordHash || !verifyPassword(input.current_password, passwordHash)) {
      throw new UnauthorizedException("当前密码不正确");
    }
    const item = await this.repository.changePassword(
      actor.user_id,
      input.new_password,
    );

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async listSessions(query: unknown) {
    const actor = this.authorization.requireActor();
    const input = parseInput(AuthSessionListQuerySchema, query);
    if (input.audience && input.audience !== actor.audience) {
      throw new ForbiddenException("不能查看其他登录受众的会话");
    }

    return AuthSessionListResponseSchema.parse(
      await this.repository.listSessions({
        user_id: actor.user_id,
        audience: input.audience ?? actor.audience,
        status: input.status,
        page: input.page,
        page_size: input.page_size,
      }),
    );
  }

  async revokeOtherSessions() {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const currentToken = this.requestContext.getSessionToken();
    if (!currentToken) {
      throw new UnauthorizedException("当前请求缺少会话令牌");
    }
    const result = await this.repository.revokeOtherSessions(
      actor.user_id,
      currentToken,
    );

    return AuthRevokeOthersResponseSchema.parse({
      request_id: context.request_id,
      item: result,
    });
  }

  async logout(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthSessionRevokeSchema, body);
    const item = await this.repository.revokeSession(input.token);

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
