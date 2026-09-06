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
import { PlatformStateStore } from "../../runtime/platform-state.store";
import { RequestContextStore } from "../../runtime/request-context.store";
import { parseInput } from "../../runtime/validation";
import { IdentityStateStore } from "../identity/identity.state";

function nowIso(): string {
  return new Date().toISOString();
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(IdentityStateStore)
    private readonly stateStore: IdentityStateStore,
    @Inject(PlatformStateStore)
    private readonly platformState: PlatformStateStore,
    @Inject(AuthorizationService)
    private readonly authorization: AuthorizationService,
    @Inject(RequestContextStore)
    private readonly requestContext: RequestContextStore,
  ) {}

  register(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthRegisterSchema, body);
    if (input.audience !== "user") {
      throw new ForbiddenException("当前注册接口仅支持普通用户");
    }

    const item = this.stateStore.createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      audience: "user",
      verified: false,
    });

    if (input.agree_marketing) {
      this.stateStore.upsertSubscription(item.id, {
        channel: "newsletter",
        status: "active",
        consent_at: nowIso(),
      });
    }

    this.stateStore.recordNotification({
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

    this.platformState.recordAudit({
      actor_id: item.id,
      action: "auth.register",
      entity: "user",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  verifyEmail(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthVerifyEmailSchema, body);
    const before = this.stateStore.getUserByEmail(input.email);
    const item = this.stateStore.verifyEmail(input);

    this.platformState.recordAudit({
      actor_id: item.id,
      action: "auth.email.verify",
      entity: "user",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityUserMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  login(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthLoginSchema, body);
    const user = this.stateStore.authenticate(input);
    const item = this.stateStore.issueSession(user.id, context.request_id);

    this.platformState.recordAudit({
      actor_id: user.id,
      action: "auth.session.create",
      entity: "session",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  forgotPassword(body: unknown) {
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthForgotPasswordSchema, body);
    const user = this.stateStore.getUserByEmail(input.email);
    const item = this.stateStore.recordNotification({
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

    this.platformState.recordAudit({
      actor_id: user?.id ?? 1,
      action: "auth.password_reset.request",
      entity: "notification_delivery",
      entity_id: item.id,
      before: null,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return IdentityNotificationMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }

  listSessions(query: unknown) {
    const actor = this.authorization.requireActor();
    const input = parseInput(AuthSessionListQuerySchema, query);
    if (input.audience && input.audience !== actor.audience) {
      throw new ForbiddenException("不能查看其他登录受众的会话");
    }

    return AuthSessionListResponseSchema.parse(
      this.stateStore.listSessions({
        user_id: actor.user_id,
        audience: input.audience ?? actor.audience,
        status: input.status,
        page: input.page,
        page_size: input.page_size,
      }),
    );
  }

  logout(body: unknown) {
    const actor = this.authorization.requireActor();
    const context = this.requestContext.requireContext();
    const input = parseInput(AuthSessionRevokeSchema, body);
    const before = this.stateStore.getSessionByToken(input.token);
    if (before && before.user_id !== actor.user_id) {
      throw new ForbiddenException("不能撤销其他账号的会话");
    }

    const item = this.stateStore.revokeSession(input.token);
    this.platformState.recordAudit({
      actor_id: actor.user_id,
      action: "auth.session.revoke",
      entity: "session",
      entity_id: item.id,
      before,
      after: item,
      ip: context.ip ?? null,
      request_id: context.request_id,
    });

    return AuthSessionMutationResponseSchema.parse({
      request_id: context.request_id,
      item,
    });
  }
}
