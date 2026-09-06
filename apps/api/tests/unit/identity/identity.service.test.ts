import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../runtime/request-context.store";
import type { IdentityStateStore } from "../identity/identity.state";
import type { PlatformStateStore } from "../../runtime/platform-state.store";
import type { AuthorizationService } from "../../runtime/authorization.service";
import { IdentityService } from "./identity.service";

describe("IdentityService", () => {
  let service: IdentityService;
  let stateStore: IdentityStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      getUserById: vi.fn(),
      updateProfile: vi.fn(),
      listAddresses: vi.fn(),
      listSubscriptions: vi.fn(),
      getDealerContextForUser: vi.fn(),
      upsertAddress: vi.fn(),
      deleteAddress: vi.fn(),
      upsertSubscription: vi.fn(),
      listUsers: vi.fn(),
      getUserByEmail: vi.fn(),
      updateUserStatus: vi.fn(),
      assignRole: vi.fn(),
      listRoles: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      deleteRole: vi.fn(),
      listPermissions: vi.fn(),
      createDataRequest: vi.fn(),
      listDataRequests: vi.fn(),
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
        request_id: "req-identity-123",
        ip: "127.0.0.1",
        actor: {
          user_id: 1,
          audience: "user",
          permissions: [],
        },
      })),
    } as any;

    service = new IdentityService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("getProfile", () => {
    it("获取当前用户个人资料", async () => {
      const user = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.getUserById.mockReturnValue(user);
      stateStore.listAddresses.mockReturnValue([
        { id: 1, user_id: 1, label: "家", address: "123 Main St" },
      ]);
      stateStore.listSubscriptions.mockReturnValue([
        { id: 1, user_id: 1, channel: "newsletter", status: "active" },
      ]);
      stateStore.getDealerContextForUser.mockReturnValue(null);

      const result = await service.getProfile();

      expect(stateStore.getUserById).toHaveBeenCalledWith(1);
      expect(stateStore.listAddresses).toHaveBeenCalledWith(1);
      expect(stateStore.listSubscriptions).toHaveBeenCalledWith(1);
      expect(stateStore.getDealerContextForUser).toHaveBeenCalledWith(1);

      expect(result).toMatchObject({
        request_id: "req-identity-123",
        item: {
          user,
          permissions: [],
          addresses: expect.any(Array),
          subscriptions: expect.any(Array),
          dealer_context: null,
        },
      });
    });
  });

  describe("updateProfile", () => {
    it("更新用户个人资料", async () => {
      const beforeUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
      };

      const afterUser = {
        id: 1,
        email: "test@example.com",
        name: "Updated Name",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.getUserById.mockReturnValue(beforeUser);
      stateStore.updateProfile.mockReturnValue(afterUser);

      const result = await service.updateProfile({
        name: "Updated Name",
      });

      expect(stateStore.updateProfile).toHaveBeenCalledWith(1, {
        name: "Updated Name",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "identity.profile.update",
        entity: "user",
        entity_id: 1,
        before: beforeUser,
        after: afterUser,
        ip: "127.0.0.1",
        request_id: "req-identity-123",
      });

      expect(result).toMatchObject({
        request_id: "req-identity-123",
        item: afterUser,
      });
    });
  });

  describe("createAddress", () => {
    it("创建用户地址", async () => {
      const newAddress = {
        id: 1,
        user_id: 1,
        label: "家",
        address: "123 Main St",
        city: "New York",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.upsertAddress.mockReturnValue(newAddress);

      const result = await service.createAddress({
        label: "家",
        address: "123 Main St",
        city: "New York",
      });

      expect(stateStore.upsertAddress).toHaveBeenCalledWith({
        user_id: 1,
        label: "家",
        address: "123 Main St",
        city: "New York",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "identity.address.create",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-identity-123",
        item: newAddress,
      });
    });
  });

  describe("listNotifications", () => {
    it("列出用户的通知", async () => {
      const notifications = {
        items: [
          { id: 1, user_id: 1, kind: "order.shipped", status: "sent" },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      stateStore.listNotifications.mockReturnValue(notifications);

      const result = await service.listNotifications({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listNotifications).toHaveBeenCalledWith({
        user_id: 1,
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(notifications);
    });
  });

  describe("listUsers", () => {
    it("员工列出所有用户", async () => {
      const users = {
        items: [
          { id: 1, email: "user1@example.com" },
          { id: 2, email: "user2@example.com" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["identity:read"],
      });

      stateStore.listUsers.mockReturnValue(users);

      const result = await service.listUsers({
        page: 1,
        page_size: 20,
      });

      expect(authorization.requireStaffPermission).toHaveBeenCalledWith(
        "identity:read",
      );
      expect(result).toMatchObject(users);
    });
  });

  describe("assignRole", () => {
    it("为用户分配角色", async () => {
      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["identity:write"],
      });

      stateStore.assignRole.mockReturnValue({
        id: 1,
        user_id: 1,
        role_id: 2,
      });

      await service.assignRole(1, {
        role_id: 2,
      });

      expect(stateStore.assignRole).toHaveBeenCalledWith(1, 2);
      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "identity.role.assign",
        }),
      );
    });
  });

  describe("listRoles", () => {
    it("列出所有角色", async () => {
      const roles = {
        items: [
          { id: 1, name: "user", permissions: [] },
          { id: 2, name: "dealer", permissions: ["dealer:read"] },
        ],
        total: 2,
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["identity:read"],
      });

      stateStore.listRoles.mockReturnValue(roles);

      const result = await service.listRoles();

      expect(stateStore.listRoles).toHaveBeenCalled();
      expect(result).toMatchObject(roles);
    });
  });

  describe("createDataRequest", () => {
    it("创建数据访问请求", async () => {
      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "user",
        permissions: [],
      });

      const dataRequest = {
        id: 1,
        user_id: 1,
        type: "export",
        status: "pending",
      };

      stateStore.createDataRequest.mockReturnValue(dataRequest);

      const result = await service.createDataRequest({
        type: "export",
      });

      expect(stateStore.createDataRequest).toHaveBeenCalledWith({
        user_id: 1,
        type: "export",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "identity.data_request.create",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-identity-123",
        item: dataRequest,
      });
    });
  });
});
