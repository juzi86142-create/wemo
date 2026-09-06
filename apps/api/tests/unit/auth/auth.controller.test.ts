import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/common/testing";
import { AuthController } from "../../src/modules/auth/auth.controller";
import { AuthService } from "../../src/modules/auth/auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: vi.fn(),
            login: vi.fn(),
            verifyEmail: vi.fn(),
            forgotPassword: vi.fn(),
            listSessions: vi.fn(),
            logout: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("调用service.register并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, email: "test@example.com" },
      };

      vi.mocked(service.register).mockResolvedValue(mockResult);

      const result = await controller.register({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
        audience: "user",
        agree_marketing: true,
      });

      expect(service.register).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
        name: "Test User",
        audience: "user",
        agree_marketing: true,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("login", () => {
    it("调用service.login并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, token: "session-token" },
      };

      vi.mocked(service.login).mockResolvedValue(mockResult);

      const result = await controller.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(service.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("verifyEmail", () => {
    it("调用service.verifyEmail并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, email: "test@example.com", verified: true },
      };

      vi.mocked(service.verifyEmail).mockResolvedValue(mockResult);

      const result = await controller.verifyEmail({
        email: "test@example.com",
      });

      expect(service.verifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("forgotPassword", () => {
    it("调用service.forgotPassword并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, kind: "account.password_reset.requested" },
      };

      vi.mocked(service.forgotPassword).mockResolvedValue(mockResult);

      const result = await controller.forgotPassword({
        email: "test@example.com",
      });

      expect(service.forgotPassword).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("listSessions", () => {
    it("调用service.listSessions并返回结果", async () => {
      const mockResult = {
        items: [{ id: 1, token: "token-1" }],
        total: 1,
        page: 1,
        page_size: 20,
      };

      vi.mocked(service.listSessions).mockReturnValue(mockResult);

      const result = await controller.listSessions({
        page: 1,
        page_size: 20,
      });

      expect(service.listSessions).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("logout", () => {
    it("调用service.logout并返回结果", async () => {
      const mockResult = {
        request_id: "req-123",
        item: { id: 1, token: "token-123", revoked_at: "2026-09-06T00:00:00.000Z" },
      };

      vi.mocked(service.logout).mockResolvedValue(mockResult);

      const result = await controller.logout({
        token: "token-123",
      });

      expect(service.logout).toHaveBeenCalledWith({
        token: "token-123",
      });
      expect(result).toEqual(mockResult);
    });
  });
});
