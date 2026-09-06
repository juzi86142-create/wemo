import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../src/runtime/request-context.store";
import type { IdentityStateStore } from "../identity/identity.state";
import type { PlatformStateStore } from "../../src/runtime/platform-state.store";
import type { AuthorizationService } from "../../src/runtime/authorization.service";
import { AuthService } from "../../src/modules/auth/auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let stateStore: IdentityStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
      verifyEmail: vi.fn(),
      authenticate: vi.fn(),
      issueSession: vi.fn(),
      listSessions: vi.fn(),
      getSessionByToken: vi.fn(),
      revokeSession: vi.fn(),
      upsertSubscription: vi.fn(),
      recordNotification: vi.fn(),
    } as any;

    platformState = {
      recordAudit: vi.fn(),
    } as any;

    authorization = {
      requireActor: vi.fn(),
      requireStaffPermission: vi.fn(),
    } as any;

    requestContext = {
      requireContext: vi.fn(() => ({
        request_id: "req-test-123",
        ip: "127.0.0.1",
        actor: {
          user_id: 1,
          audience: "user",
          permissions: [],
        },
      })),
      getActor: vi.fn(() => ({
        user_id: 1,
        audience: "user",
        permissions: [],
      })),
    } as any;

    service = new AuthService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("register", () => {
    it("正常注册普通用户并返回用户信息", async () => {
      const newUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        audience: "user" as const,
        verified: false,
      };

      stateStore.createUser.mockReturnValue(newUser);
      stateStore.recordNotification.mockReturnValue({ id: 1 });

      const result = await service.register({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
        audience: "user",
        agree_marketing: true,
      });

      expect(stateStore.createUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
        audience: "user",
        verified: false,
      });

      expect(stateStore.upsertSubscription).toHaveBeenCalledWith(1, {
        channel: "newsletter",
        status: "active",
        consent_at: expect.any(String),
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "auth.register",
        entity: "user",
        entity_id: 1,
        before: null,
        after: newUser,
        ip: "127.0.0.1",
        request_id: "req-test-123",
      });

      expect(result).toMatchObject({
        request_id: "req-test-123",
        item: newUser,
      });
    });

    it("注册时不订阅营销邮件", async () => {
      const newUser = {
        id: 2,
        email: "nomarketing@example.com",
        name: "No Marketing",
        audience: "user" as const,
        verified: false,
      };

      stateStore.createUser.mockReturnValue(newUser);

      await service.register({
        email: "nomarketing@example.com",
        password: "Password123!",
        name: "No Marketing",
        audience: "user",
        agree_marketing: false,
      });

      expect(stateStore.upsertSubscription).not.toHaveBeenCalled();
    });
  });

  describe("verifyEmail", () => {
    it("验证邮箱并更新用户状态", async () => {
      const beforeUser = {
        id: 1,
        email: "test@example.com",
        verified: false,
      };

      const afterUser = {
        id: 1,
        email: "test@example.com",
        verified: true,
      };

      stateStore.getUserByEmail.mockReturnValue(beforeUser);
      stateStore.verifyEmail.mockReturnValue(afterUser);

      const result = await service.verifyEmail({
        email: "test@example.com",
      });

      expect(stateStore.getUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(stateStore.verifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "auth.email.verify",
        entity: "user",
        entity_id: 1,
        before: beforeUser,
        after: afterUser,
        ip: "127.0.0.1",
        request_id: "req-test-123",
      });

      expect(result).toMatchObject({
        request_id: "req-test-123",
        item: afterUser,
      });
    });
  });

  describe("login", () => {
    it("用户登录并创建会话", async () => {
      const user = { id: 1, email: "test@example.com", audience: "user" };
      const session = {
        id: 1,
        user_id: 1,
        token: "session-token-123",
        created_at: "2026-09-06T00:00:00.000Z",
      };

      stateStore.authenticate.mockReturnValue(user);
      stateStore.issueSession.mockReturnValue(session);

      const result = await service.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(stateStore.authenticate).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(stateStore.issueSession).toHaveBeenCalledWith(
        1,
        "req-test-123",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "auth.session.create",
        entity: "session",
        entity_id: 1,
        before: null,
        after: session,
        ip: "127.0.0.1",
        request_id: "req-test-123",
      });

      expect(result).toMatchObject({
        request_id: "req-test-123",
        item: session,
      });
    });
  });

  describe("forgotPassword", () => {
    it("发送密码重置邮件", async () => {
      const user = { id: 1, email: "test@example.com", audience: "user" };
      const notification = { id: 1, kind: "account.password_reset.requested" };

      stateStore.getUserByEmail.mockReturnValue(user);
      stateStore.recordNotification.mockReturnValue(notification);

      const result = await service.forgotPassword({
        email: "test@example.com",
      });

      expect(stateStore.getUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(stateStore.recordNotification).toHaveBeenCalledWith({
        recipient_user_id: 1,
        company_id: null,
        audience: "user",
        kind: "account.password_reset.requested",
        channel: "email",
        template_key: "account_password_reset",
        request_id: "req-test-123",
        payload: { email: "test@example.com", accepted: true },
        status: "queued",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "auth.password_reset.request",
        entity: "notification_delivery",
        entity_id: 1,
        before: null,
        after: notification,
        ip: "127.0.0.1",
        request_id: "req-test-123",
      });

      expect(result).toMatchObject({
        request_id: "req-test-123",
        item: notification,
      });
    });
  });

  describe("listSessions", () => {
    it("列出当前用户的会话", async () => {
      const sessions = {
        items: [
          { id: 1, user_id: 1, token: "token-1" },
          { id: 2, user_id: 1, token: "token-2" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.listSessions.mockReturnValue(sessions);

      const result = await service.listSessions({
        audience: "user",
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listSessions).toHaveBeenCalledWith({
        user_id: 1,
        audience: "user",
        status: undefined,
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(sessions);
    });
  });

  describe("logout", () => {
    it("撤销当前会话", async () => {
      const session = { id: 1, user_id: 1, token: "token-123", revoked_at: null };
      const revokedSession = { ...session, revoked_at: "2026-09-06T00:00:00.000Z" };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.getSessionByToken.mockReturnValue(session);
      stateStore.revokeSession.mockReturnValue(revokedSession);

      const result = await service.logout({
        token: "token-123",
      });

      expect(stateStore.getSessionByToken).toHaveBeenCalledWith("token-123");
      expect(stateStore.revokeSession).toHaveBeenCalledWith("token-123");

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "auth.session.revoke",
        entity: "session",
        entity_id: 1,
        before: session,
        after: revokedSession,
        ip: "127.0.0.1",
        request_id: "req-test-123",
      });

      expect(result).toMatchObject({
        request_id: "req-test-123",
        item: revokedSession,
      });
    });
  });
});
