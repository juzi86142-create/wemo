import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RequestContext } from "../../../runtime/request-context.store";
import type { IdentityStateStore } from "../../identity/identity.state";
import type { PlatformStateStore } from "../../../runtime/platform-state.store";
import type { AuthorizationService } from "../../../runtime/authorization.service";
import { DealersService } from "./dealers.service";

describe("DealersService", () => {
  let service: DealersService;
  let stateStore: IdentityStateStore;
  let platformState: PlatformStateStore;
  let authorization: AuthorizationService;
  let requestContext: RequestContext;

  beforeEach(() => {
    stateStore = {
      listPublicDealerListings: vi.fn(),
      createDealerApplication: vi.fn(),
      listDealerApplications: vi.fn(),
      getDealerApplication: vi.fn(),
      submitDealerApplication: vi.fn(),
      reviewDealerApplication: vi.fn(),
      getDealerCompany: vi.fn(),
      updateDealerCompany: vi.fn(),
      listDealerCompanies: vi.fn(),
      getDealerContextForUser: vi.fn(),
      createDealerMember: vi.fn(),
      listDealerMembers: vi.fn(),
      listDealerAddresses: vi.fn(),
      createDealerAddress: vi.fn(),
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
        request_id: "req-dealer-123",
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

    service = new DealersService(
      stateStore,
      platformState,
      authorization,
      requestContext,
    );
  });

  describe("listPublicListings", () => {
    it("列出公开的经销商列表", async () => {
      const listings = {
        items: [
          {
            id: 1,
            company_name: "玩具经销商A",
            status: "active",
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };

      stateStore.listPublicDealerListings.mockReturnValue(listings);

      const result = await service.listPublicListings({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listPublicDealerListings).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(listings);
    });
  });

  describe("createApplication", () => {
    it("用户创建经销商申请", async () => {
      const application = {
        id: 1,
        applicant_user_id: 1,
        company_name: "我的玩具店",
        status: "draft",
      };

      stateStore.createDealerApplication.mockReturnValue(application);

      const result = await service.createApplication({
        company_name: "我的玩具店",
        contact_email: "contact@mystore.com",
      });

      expect(stateStore.createDealerApplication).toHaveBeenCalledWith({
        company_name: "我的玩具店",
        contact_email: "contact@mystore.com",
        applicant_user_id: 1,
        request_id: "req-dealer-123",
        payload: {},
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "dealer.application.create",
        entity: "dealer_application",
        entity_id: 1,
        before: null,
        after: application,
        ip: "127.0.0.1",
        request_id: "req-dealer-123",
      });

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: application,
      });
    });
  });

  describe("listApplications", () => {
    it("用户查看自己的申请列表", async () => {
      const applications = {
        items: [
          { id: 1, company_name: "我的玩具店", status: "submitted" },
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

      stateStore.listDealerApplications.mockReturnValue(applications);

      const result = await service.listApplications({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listDealerApplications).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        applicant_user_id: 1,
      });

      expect(result).toMatchObject(applications);
    });

    it("员工查看所有申请列表", async () => {
      const applications = {
        items: [
          { id: 1, company_name: "店铺A", status: "submitted" },
          { id: 2, company_name: "店铺B", status: "pending_review" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      authorization.requireActor.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["dealers:read"],
      });

      stateStore.listDealerApplications.mockReturnValue(applications);

      const result = await service.listApplications({
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listDealerApplications).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(applications);
    });
  });

  describe("submitApplication", () => {
    it("提交经销商申请", async () => {
      const existing = {
        id: 1,
        applicant_user_id: 1,
        status: "draft",
      };

      const submitted = {
        id: 1,
        applicant_user_id: 1,
        status: "submitted",
        submitted_at: "2026-09-06T00:00:00.000Z",
      };

      stateStore.getDealerApplication.mockReturnValue(existing);
      stateStore.submitDealerApplication.mockReturnValue(submitted);

      const result = await service.submitApplication(1, {
        note: "请审核我的申请",
      });

      expect(stateStore.submitDealerApplication).toHaveBeenCalledWith(
        1,
        "req-dealer-123",
        1,
        "请审核我的申请",
      );

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "dealer.application.submit",
        entity: "dealer_application",
        entity_id: 1,
        before: existing,
        after: submitted,
        ip: "127.0.0.1",
        request_id: "req-dealer-123",
      });

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: submitted,
      });
    });
  });

  describe("reviewApplication", () => {
    it("员工审核通过经销商申请", async () => {
      const before = {
        id: 1,
        status: "submitted",
      };

      const reviewResult = {
        application: {
          id: 1,
          status: "approved",
        },
        company: {
          id: 1,
          name: "我的玩具店",
          status: "active",
        },
        member: {
          id: 1,
          user_id: 1,
          company_id: 1,
        },
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["dealers:write"],
      });

      stateStore.getDealerApplication.mockReturnValue(before);
      stateStore.reviewDealerApplication.mockReturnValue(reviewResult);

      const result = await service.reviewApplication(1, {
        decision: "approved",
        note: "申请通过",
      });

      expect(stateStore.reviewDealerApplication).toHaveBeenCalledWith(
        1,
        { decision: "approved", note: "申请通过" },
        99,
        "req-dealer-123",
      );

      expect(platformState.recordAudit).toHaveBeenCalledTimes(3);

      expect(platformState.recordAudit).toHaveBeenNthCalledWith(1, {
        actor_id: 99,
        action: "dealer.application.review",
        entity: "dealer_application",
        entity_id: 1,
        before: before,
        after: reviewResult.application,
        ip: "127.0.0.1",
        request_id: "req-dealer-123",
      });

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: reviewResult,
      });
    });
  });

  describe("getCompany", () => {
    it("经销商查看自己的企业信息", async () => {
      const company = {
        id: 1,
        name: "我的玩具店",
        status: "active",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "dealer",
        company_id: 1,
        permissions: [],
      });

      stateStore.getDealerContextForUser.mockReturnValue({
        company_id: 1,
      });

      stateStore.getDealerCompany.mockReturnValue(company);

      const result = await service.getCompany();

      expect(stateStore.getDealerCompany).toHaveBeenCalledWith(1);

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: company,
      });
    });
  });

  describe("updateCompany", () => {
    it("经销商更新企业信息", async () => {
      const before = {
        id: 1,
        name: "我的玩具店",
        address: "旧地址",
      };

      const after = {
        id: 1,
        name: "我的玩具店",
        address: "新地址",
      };

      authorization.requireActor.mockReturnValue({
        user_id: 1,
        audience: "dealer",
        company_id: 1,
        permissions: [],
      });

      stateStore.getDealerContextForUser.mockReturnValue({
        company_id: 1,
      });

      stateStore.getDealerCompany.mockReturnValue(before);
      stateStore.updateDealerCompany.mockReturnValue(after);

      const result = await service.updateCompany({
        address: "新地址",
      });

      expect(stateStore.updateDealerCompany).toHaveBeenCalledWith(1, {
        address: "新地址",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith({
        actor_id: 1,
        action: "dealer.company.update",
        entity: "dealer_company",
        entity_id: 1,
        before: before,
        after: after,
        ip: "127.0.0.1",
        request_id: "req-dealer-123",
      });

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: after,
      });
    });
  });

  describe("createMember", () => {
    it("添加企业成员", async () => {
      const member = {
        id: 1,
        company_id: 1,
        user_id: 2,
        role: "member",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["dealers:write"],
      });

      stateStore.createDealerMember.mockReturnValue(member);

      const result = await service.createMember(1, {
        user_id: 2,
        role: "member",
      });

      expect(stateStore.createDealerMember).toHaveBeenCalledWith({
        company_id: 1,
        user_id: 2,
        role: "member",
      });

      expect(platformState.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "dealer.member.create",
        }),
      );

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: member,
      });
    });
  });

  describe("listMembers", () => {
    it("列出企业成员", async () => {
      const members = {
        items: [
          { id: 1, user_id: 1, role: "admin" },
          { id: 2, user_id: 2, role: "member" },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      };

      stateStore.listDealerMembers.mockReturnValue(members);

      const result = await service.listMembers(1, {
        page: 1,
        page_size: 20,
      });

      expect(stateStore.listDealerMembers).toHaveBeenCalledWith({
        company_id: 1,
        page: 1,
        page_size: 20,
      });

      expect(result).toMatchObject(members);
    });
  });

  describe("createAddress", () => {
    it("创建企业地址", async () => {
      const address = {
        id: 1,
        company_id: 1,
        label: "总部",
        address: "123 Business St",
        city: "New York",
      };

      authorization.requireStaffPermission.mockReturnValue({
        user_id: 99,
        audience: "staff",
        permissions: ["dealers:write"],
      });

      stateStore.createDealerAddress.mockReturnValue(address);

      const result = await service.createAddress(1, {
        label: "总部",
        address: "123 Business St",
        city: "New York",
      });

      expect(stateStore.createDealerAddress).toHaveBeenCalledWith({
        company_id: 1,
        label: "总部",
        address: "123 Business St",
        city: "New York",
      });

      expect(result).toMatchObject({
        request_id: "req-dealer-123",
        item: address,
      });
    });
  });
});
