import {
  AuthForgotPasswordSchema,
  AuthLoginSchema,
  AuthRegisterSchema,
  AuthSessionMutationResponseSchema,
  IdentityAddressListResponseSchema,
  IdentityProfileResponseSchema,
  IdentityUserMutationResponseSchema,
  OrderListResponseSchema,
  OrderMutationResponseSchema,
  SessionActorSchema,
  type AuthLoginInput,
  type AuthRegisterInput,
  type OrderListQuery,
  type SessionActor,
} from "@wemo/contracts";

import { storeSessionToken } from "../platform/api-client";

const DEMO_TIMESTAMP = "2026-09-08T00:00:00.000Z";
const demoUser = {
  id: 101,
  email: "alex@wemove.demo",
  name: "Alex Taylor",
  phone: "+1 503 555 0124",
  locale: "en-US",
  audience: "user" as const,
  status: "active" as const,
  verified_at: DEMO_TIMESTAMP,
  created_at: "2026-01-12T00:00:00.000Z",
  updated_at: DEMO_TIMESTAMP,
};

const demoAddresses = [
  {
    id: 201,
    user_id: demoUser.id,
    kind: "Home",
    payload: {
      recipient: demoUser.name,
      line1: "18 Active Lane",
      city: "Portland",
      region: "OR",
      postal_code: "97205",
      country: "United States",
    },
    created_at: DEMO_TIMESTAMP,
  },
];

const demoOrder = {
  id: 7001,
  order_no: "DEMO-7001",
  channel: "b2c" as const,
  user_id: demoUser.id,
  company_id: null,
  currency: "USD",
  subtotal_minor: 7600,
  tax_minor: 0,
  shipping_minor: 0,
  total_minor: 7600,
  status: "completed" as const,
  address_snapshot: demoAddresses[0]?.payload ?? {},
  pricing_snapshot: { source: "frontend-demo" },
  items: [
    {
      id: 7101,
      variant_id: 1001,
      sku_snapshot: "WEMO-RPB-01",
      name_snapshot: "Roll & Play Bowling Set",
      quantity: 1,
      unit_price_minor: 3200,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 3200,
      detail_snapshot: { source: "frontend-demo" },
    },
    {
      id: 7102,
      variant_id: 1002,
      sku_snapshot: "WEMO-SBB-01",
      name_snapshot: "Steady Balance Board",
      quantity: 1,
      unit_price_minor: 4400,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 4400,
      detail_snapshot: { source: "frontend-demo" },
    },
  ],
  status_history: [
    {
      status: "completed" as const,
      request_id: "demo-order-7001",
      note: "Frontend demonstration order",
      created_at: DEMO_TIMESTAMP,
    },
  ],
  created_at: "2026-08-28T00:00:00.000Z",
  updated_at: DEMO_TIMESTAMP,
};

export async function login(input: AuthLoginInput) {
  AuthLoginSchema.parse(input);
  const response = AuthSessionMutationResponseSchema.parse(
    {
      request_id: "demo-login",
      item: {
        id: 301,
        token: "frontend-demo-session",
        user_id: demoUser.id,
        audience: "user",
        company_id: null,
        permissions: [],
        expires_at: "2027-09-08T00:00:00.000Z",
        revoked_at: null,
        last_seen_at: DEMO_TIMESTAMP,
        created_at: DEMO_TIMESTAMP,
      },
    },
  );
  storeSessionToken(response.item.token);
  return response.item;
}

export async function register(input: AuthRegisterInput) {
  const parsed = AuthRegisterSchema.parse(input);
  return IdentityUserMutationResponseSchema.parse(
    {
      request_id: "demo-register",
      item: {
        ...demoUser,
        email: parsed.email,
        name: parsed.name,
      },
    },
  );
}

export async function forgotPassword(email: string) {
  AuthForgotPasswordSchema.parse({ email });
  return { request_id: "demo-forgot-password", accepted: true };
}

export async function getSession(): Promise<SessionActor | null> {
  return SessionActorSchema.parse({
    user_id: demoUser.id,
    audience: "user",
    permissions: [],
  });
}

export async function getProfile() {
  return IdentityProfileResponseSchema.parse({
    request_id: "demo-profile",
    item: {
      user: demoUser,
      permissions: [],
      addresses: demoAddresses,
      subscriptions: [],
      dealer_context: null,
    },
  });
}

export async function getAddresses() {
  return IdentityAddressListResponseSchema.parse({
    items: demoAddresses,
    page: 1,
    page_size: 20,
    total: demoAddresses.length,
  });
}

export async function getAccountOrders(query: OrderListQuery = { page: 1, page_size: 10 }) {
  const items = [demoOrder].filter(
    (order) => (!query.status || order.status === query.status) && (!query.channel || order.channel === query.channel),
  );
  return OrderListResponseSchema.parse({
    items,
    page: query.page,
    page_size: query.page_size,
    total: items.length,
  });
}

export async function getAccountOrder(id: string) {
  return OrderMutationResponseSchema.parse({
    request_id: `demo-order-${id}`,
    item: { ...demoOrder, id: Number(id) || demoOrder.id },
  });
}

export type AccountProfile = Awaited<ReturnType<typeof getProfile>>["item"];
export type AccountAddresses = Awaited<ReturnType<typeof getAddresses>>["items"];
export type AccountOrders = Awaited<ReturnType<typeof getAccountOrders>>;
