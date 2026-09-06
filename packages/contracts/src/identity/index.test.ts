import { describe, expect, it } from "vitest";

import {
  AuthRegisterSchema,
  AuthSessionRevokeSchema,
  IdentityNotificationListQuerySchema,
  IdentityUserMutationResponseSchema,
  PermissionCodeSchema,
} from "./index.js";

describe("identity contracts", () => {
  it("parses user and session payloads", () => {
    expect(
      AuthRegisterSchema.parse({
        email: "user@example.com",
        password: "password123",
        name: "User",
        audience: "user",
        agree_terms: true,
        agree_marketing: false,
      }),
    ).toMatchObject({
      email: "user@example.com",
      audience: "user",
    });

    expect(
      IdentityUserMutationResponseSchema.parse({
        request_id: "req_001",
        item: {
          id: 1,
          email: "user@example.com",
          name: "User",
          phone: null,
          locale: "en-US",
          audience: "user",
          status: "active",
          verified_at: "2026-09-05T00:00:00.000Z",
          created_at: "2026-09-05T00:00:00.000Z",
          updated_at: "2026-09-05T00:00:00.000Z",
        },
      }),
    ).toMatchObject({
      request_id: "req_001",
      item: { id: 1, audience: "user" },
    });

    expect(
      AuthSessionRevokeSchema.parse({
        token: "session-token",
      }),
    ).toEqual({
      token: "session-token",
    });
  });

  it("parses notification queries and rejects invalid audiences", () => {
    expect(
      IdentityNotificationListQuerySchema.parse({
        recipient_user_id: 1,
        status: "queued",
        page: 1,
        page_size: 20,
      }),
    ).toMatchObject({
      recipient_user_id: 1,
      status: "queued",
    });

    expect(
      IdentityNotificationListQuerySchema.safeParse({
        audience: "invalid",
      }).success,
    ).toBe(false);
  });

  it("accepts multi-segment permission codes", () => {
    expect(PermissionCodeSchema.parse("dealer:company:read")).toBe(
      "dealer:company:read",
    );
    expect(PermissionCodeSchema.safeParse("dealer-read").success).toBe(false);
  });
});
