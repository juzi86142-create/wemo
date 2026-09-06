import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApp } from "../bootstrap";

function actorHeaders(actor: {
  user_id: number;
  audience: "user" | "dealer" | "staff";
  permissions: string[];
  company_id?: number;
}) {
  const payload: Record<string, unknown> = {
    user_id: actor.user_id,
    audience: actor.audience,
    permissions: actor.permissions,
  };
  if (actor.company_id) {
    payload.company_id = actor.company_id;
  }
  return {
    "x-wemo-actor": JSON.stringify(payload),
  };
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}@wemove.local`;
}

describe("identity and dealers integration", () => {
  const state = {
    app: null as Awaited<ReturnType<typeof createApiApp>> | null,
    server: null as FastifyInstance | null,
  };

  beforeAll(async () => {
    state.app = await createApiApp({ logger: false });
    await state.app.init();
    state.server = state.app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await state.app?.close();
  });

  it("runs the user and dealer lifecycle with company scoping", async () => {
    const server = state.server!;
    const userEmail = uniqueEmail("buyer");
    const teammateEmail = uniqueEmail("team");
    const password = "password123";

    const register = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: userEmail,
        password,
        name: "Buyer User",
        audience: "user",
        agree_terms: true,
        agree_marketing: true,
      },
    });
    expect(register.statusCode).toBe(200);
    const registerBody = JSON.parse(register.body) as {
      item: { id: number; status: string };
    };
    expect(registerBody.item.status).toBe("pending_verification");

    const preLogin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: userEmail,
        password,
      },
    });
    expect(preLogin.statusCode).toBe(403);

    const verify = await server.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: {
        email: userEmail,
      },
    });
    expect(verify.statusCode).toBe(200);

    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: userEmail,
        password,
      },
    });
    expect(login.statusCode).toBe(200);
    const loginBody = JSON.parse(login.body) as {
      request_id: string;
      item: {
        id: number;
        token: string;
        user_id: number;
        audience: "user" | "dealer" | "staff";
        company_id: number | null;
        permissions: string[];
      };
    };
    expect(loginBody.item.audience).toBe("user");
    expect(loginBody.item.company_id).toBeNull();

    const userHeaders = actorHeaders({
      user_id: loginBody.item.user_id,
      audience: loginBody.item.audience,
      permissions: loginBody.item.permissions,
    });
    const staffHeaders = actorHeaders({
      user_id: 7,
      audience: "staff",
      permissions: [
        "settings:read",
        "settings:write",
        "audit:read",
        "jobs:read",
        "jobs:write",
        "reports:read",
        "integrations:read",
        "analytics:read",
        "identity:read",
        "identity:write",
        "dealers:read",
        "dealers:write",
        "notifications:read",
      ],
    });

    const profileBefore = await server.inject({
      method: "GET",
      url: "/api/v1/account/profile",
      headers: userHeaders,
    });
    expect(profileBefore.statusCode).toBe(200);
    const profileBeforeBody = JSON.parse(profileBefore.body) as {
      item: { dealer_context: null; user: { email: string } };
    };
    expect(profileBeforeBody.item.user.email).toBe(userEmail);
    expect(profileBeforeBody.item.dealer_context).toBeNull();

    const subscription = await server.inject({
      method: "POST",
      url: "/api/v1/account/subscriptions",
      headers: userHeaders,
      payload: {
        channel: "newsletter",
        status: "paused",
        consent_at: null,
      },
    });
    expect(subscription.statusCode).toBe(200);

    const subscriptions = await server.inject({
      method: "GET",
      url: "/api/v1/account/subscriptions",
      headers: userHeaders,
    });
    expect(JSON.parse(subscriptions.body)).toMatchObject({
      total: 1,
      items: [{ channel: "newsletter", status: "paused" }],
    });

    const dataRequest = await server.inject({
      method: "POST",
      url: "/api/v1/account/data-requests",
      headers: userHeaders,
      payload: {
        kind: "export",
        notes: "Please export my account data",
      },
    });
    expect(dataRequest.statusCode).toBe(200);

    const dataRequests = await server.inject({
      method: "GET",
      url: "/api/v1/account/data-requests",
      headers: userHeaders,
    });
    expect(JSON.parse(dataRequests.body)).toMatchObject({
      total: 1,
      items: [{ kind: "export", status: "requested" }],
    });

    const logout = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: userHeaders,
      payload: {
        token: loginBody.item.token,
      },
    });
    expect(logout.statusCode).toBe(200);
    expect(JSON.parse(logout.body)).toMatchObject({
      item: { token: loginBody.item.token, revoked_at: expect.any(String) },
    });

    const revokedSessions = await server.inject({
      method: "GET",
      url: "/api/v1/auth/sessions?status=revoked",
      headers: userHeaders,
    });
    expect(JSON.parse(revokedSessions.body)).toMatchObject({
      total: 1,
      items: [{ token: loginBody.item.token }],
    });

    const forgotPassword = await server.inject({
      method: "POST",
      url: "/api/v1/auth/forgot-password",
      payload: {
        email: userEmail,
      },
    });
    expect(forgotPassword.statusCode).toBe(200);

    const userNotifications = await server.inject({
      method: "GET",
      url: "/api/v1/account/notifications",
      headers: userHeaders,
    });
    expect(JSON.parse(userNotifications.body)).toMatchObject({
      total: expect.any(Number),
    });

    const adminNotifications = await server.inject({
      method: "GET",
      url: `/api/v1/admin/notifications?recipient_user_id=${loginBody.item.user_id}`,
      headers: staffHeaders,
    });
    expect(JSON.parse(adminNotifications.body)).toMatchObject({
      total: expect.any(Number),
    });

    const application = await server.inject({
      method: "POST",
      url: "/api/v1/dealer/applications",
      headers: userHeaders,
      payload: {
        legal_name: "Fresh Dealer Ltd.",
        display_name: "Fresh Dealer",
        country: "US",
        website: "https://dealer.example.com",
        business_type: "distributor",
        tax_id: "TX-123",
        contact_name: "Buyer User",
        contact_email: userEmail,
        contact_phone: "+1-555-0101",
        currency: "USD",
        payload: { source: "integration-test" },
      },
    });
    expect(application.statusCode).toBe(200);
    const applicationBody = JSON.parse(application.body) as {
      item: { id: number; status: string; applicant_user_id: number | null };
    };
    expect(applicationBody.item.status).toBe("draft");
    expect(applicationBody.item.applicant_user_id).toBe(loginBody.item.user_id);

    const submitted = await server.inject({
      method: "POST",
      url: `/api/v1/dealer/applications/${applicationBody.item.id}/submit`,
      headers: userHeaders,
      payload: {
        note: "Please review",
      },
    });
    expect(submitted.statusCode).toBe(200);
    const submittedBody = JSON.parse(submitted.body) as {
      item: { status: string; applicant_user_id: number | null };
    };
    expect(submittedBody.item.status).toBe("submitted");

    const adminSubmitted = await server.inject({
      method: "GET",
      url: "/api/v1/admin/dealer-applications?status=submitted",
      headers: staffHeaders,
    });
    expect(adminSubmitted.statusCode).toBe(200);
    expect(JSON.parse(adminSubmitted.body)).toMatchObject({ total: 1 });

    const underReview = await server.inject({
      method: "POST",
      url: `/api/v1/admin/dealer-applications/${applicationBody.item.id}/review`,
      headers: staffHeaders,
      payload: {
        decision: "under_review",
        reason: "Need additional documents",
      },
    });
    expect(underReview.statusCode).toBe(200);
    expect(JSON.parse(underReview.body)).toMatchObject({
      item: {
        application: { status: "under_review" },
        company: null,
        member: null,
      },
    });

    const approved = await server.inject({
      method: "POST",
      url: `/api/v1/admin/dealer-applications/${applicationBody.item.id}/review`,
      headers: staffHeaders,
      payload: {
        decision: "approved",
        tier_id: 1,
        price_list_id: 1,
        payment_terms: "Net 30",
        sales_territories: { countries: ["US"] },
        authorized_categories: { ids: [1, 2] },
        sales_rep: "rep@wemove.local",
        public_listing: true,
      },
    });
    expect(approved.statusCode).toBe(200);
    const approvedBody = JSON.parse(approved.body) as {
      item: {
        application: { status: string; company_id: number | null };
        company: { id: number; display_name: string; status: string } | null;
        member: { id: number; company_id: number } | null;
      };
    };
    expect(approvedBody.item.application.status).toBe("approved");
    expect(approvedBody.item.company).not.toBeNull();
    expect(approvedBody.item.member).not.toBeNull();

    const companyId = approvedBody.item.company!.id;

    const relogin = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: userEmail,
        password,
      },
    });
    expect(relogin.statusCode).toBe(200);
    const reloginBody = JSON.parse(relogin.body) as {
      item: {
        company_id: number | null;
        permissions: string[];
        user_id: number;
      };
    };
    expect(reloginBody.item.company_id).toBe(companyId);

    const dealerHeaders = actorHeaders({
      user_id: reloginBody.item.user_id,
      audience: "user",
      company_id: companyId,
      permissions: reloginBody.item.permissions,
    });

    const profileAfter = await server.inject({
      method: "GET",
      url: "/api/v1/account/profile",
      headers: dealerHeaders,
    });
    expect(profileAfter.statusCode).toBe(200);
    const profileAfterBody = JSON.parse(profileAfter.body) as {
      item: {
        dealer_context: { company_id: number; display_name: string } | null;
      };
    };
    expect(profileAfterBody.item.dealer_context?.company_id).toBe(companyId);

    const company = await server.inject({
      method: "GET",
      url: "/api/v1/dealer/company",
      headers: dealerHeaders,
    });
    expect(company.statusCode).toBe(200);
    expect(JSON.parse(company.body)).toMatchObject({
      item: {
        id: companyId,
        display_name: "Fresh Dealer",
        public_listing: true,
      },
    });

    const companyUpdate = await server.inject({
      method: "PATCH",
      url: "/api/v1/dealer/company",
      headers: dealerHeaders,
      payload: {
        display_name: "Fresh Dealer Prime",
      },
    });
    expect(companyUpdate.statusCode).toBe(200);
    expect(JSON.parse(companyUpdate.body)).toMatchObject({
      item: {
        id: companyId,
        display_name: "Fresh Dealer Prime",
      },
    });

    const address = await server.inject({
      method: "POST",
      url: "/api/v1/dealer/addresses",
      headers: dealerHeaders,
      payload: {
        kind: "shipping",
        payload: { city: "Shanghai" },
        public_listing: null,
      },
    });
    expect(address.statusCode).toBe(200);

    const addressList = await server.inject({
      method: "GET",
      url: "/api/v1/dealer/addresses",
      headers: dealerHeaders,
    });
    expect(JSON.parse(addressList.body)).toMatchObject({
      total: 1,
      items: [{ kind: "shipping" }],
    });

    const teammate = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: teammateEmail,
        password,
        name: "Team Mate",
        audience: "user",
        agree_terms: true,
        agree_marketing: false,
      },
    });
    expect(teammate.statusCode).toBe(200);
    const teammateBody = JSON.parse(teammate.body) as { item: { id: number } };

    const invited = await server.inject({
      method: "POST",
      url: "/api/v1/dealer/members",
      headers: dealerHeaders,
      payload: {
        user_id: teammateBody.item.id,
        role: "buyer",
        permissions: ["dealer:read"],
      },
    });
    expect(invited.statusCode).toBe(200);

    const members = await server.inject({
      method: "GET",
      url: "/api/v1/dealer/members",
      headers: dealerHeaders,
    });
    expect(JSON.parse(members.body)).toMatchObject({ total: 2 });

    const listings = await server.inject({
      method: "GET",
      url: "/api/v1/dealer/public-listings?country=US",
    });
    expect(listings.statusCode).toBe(200);
    const listingsBody = JSON.parse(listings.body) as {
      total: number;
      items: Array<{ company: { id: number; display_name: string } }>;
    };
    expect(listingsBody.total).toBe(2);
    expect(listingsBody.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          company: expect.objectContaining({
            id: companyId,
            display_name: "Fresh Dealer Prime",
          }),
        }),
      ]),
    );

    const forbiddenSelfSuspension = await server.inject({
      method: "PATCH",
      url: "/api/v1/dealer/company",
      headers: dealerHeaders,
      payload: {
        status: "suspended",
      },
    });
    expect(forbiddenSelfSuspension.statusCode).toBe(403);
    expect(JSON.parse(forbiddenSelfSuspension.body)).toMatchObject({
      code: "FORBIDDEN",
      request_id: forbiddenSelfSuspension.headers["x-request-id"],
    });

    const suspended = await server.inject({
      method: "PATCH",
      url: `/api/v1/admin/dealers/companies/${companyId}`,
      headers: staffHeaders,
      payload: {
        status: "suspended",
      },
    });
    expect(suspended.statusCode).toBe(200);
    expect(JSON.parse(suspended.body)).toMatchObject({
      item: {
        id: companyId,
        status: "suspended",
      },
    });

    const staleProfile = await server.inject({
      method: "GET",
      url: "/api/v1/account/profile",
      headers: dealerHeaders,
    });
    expect(staleProfile.statusCode).toBe(200);
    expect(JSON.parse(staleProfile.body)).toMatchObject({
      item: { dealer_context: null },
    });

    const blockedDealerRoute = await server.inject({
      method: "GET",
      url: "/api/v1/dealer/company",
      headers: dealerHeaders,
    });
    expect(blockedDealerRoute.statusCode).toBe(403);

    const reloginWithoutDealerContext = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: userEmail,
        password,
      },
    });
    expect(reloginWithoutDealerContext.statusCode).toBe(200);
    expect(JSON.parse(reloginWithoutDealerContext.body)).toMatchObject({
      item: {
        company_id: null,
      },
    });
  });
});
