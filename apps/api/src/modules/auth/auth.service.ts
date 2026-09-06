import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  AuthForgotPasswordSchema,
  AuthLoginSchema,
  AuthRegisterSchema,
  AuthSessionListQuerySchema,
  AuthSessionListResponseSchema,
  AuthSessionMutationResponseSchema,
  AuthSessionRevokeSchema,
  AuthVerifyEmailSchema,
  IdentityNotificationMutationResponseSchema,
  IdentityUserMutationResponseSchema,
} from "@wemo/contracts/identity";

import { AuthorizationService } from "../../runtime/authorization.service";
import { AuthPrismaRepository } from "./auth.prisma-repository";
import { AUTH_REPOSITORY } from "./auth.repository";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly repository: AuthPrismaRepository,
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

    if (input.agree_marketing) {
      await this.repository.upsertSubscription(item.id, {
        channel: "newsletter",
        status: "active",
        consent_at: nowIso(),
      });
    }

    await this.repository.recordNotification({
      recipient_user_id: item.id,
      company_id: null,
      audience: item.audience,
      kind: "account.email_verification.requested",
      channel: "email",
      template_key: "account_email_verification",
      request_id: context.request_id,
      payload: { email: item.email },
      status: "queued",
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
    const item = await this.repository.issueSession(user.id, context.request_id);

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  async forgotPassword(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthForgotPasswordSchema, body);
    const user = await this.repository.getUserByEmail(input.email);
    const item = await this.repository.recordNotification({
      recipient_user_id: user?.id ?? null,
      company_id: null,
      audience: user?.audience ?? "user",
      kind: "account.password_reset.requested",
      channel: "email",
      template_key: "account_password_reset",
      request_id: context.request_id,
      payload: { email: input.email, accepted: true },
      status: "queued",
    });

    return IdentityNotificationMutationResponseSchema.parse({
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
