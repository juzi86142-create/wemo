import {
  AuthForgotPasswordSchema,
  AuthLoginSchema,
  AuthRegisterSchema,
  AuthSessionListResponseSchema,
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

import { ApiError, requestJson, storeSessionToken } from "../platform/api-client";

export async function login(input: AuthLoginInput) {
  const response = AuthSessionMutationResponseSchema.parse(
    await requestJson<unknown>("/auth/login", { method: "POST", body: JSON.stringify(AuthLoginSchema.parse(input)) }),
  );
  storeSessionToken(response.item.token);
  return response.item;
}

export async function register(input: AuthRegisterInput) {
  return IdentityUserMutationResponseSchema.parse(
    await requestJson<unknown>("/auth/register", { method: "POST", body: JSON.stringify(AuthRegisterSchema.parse(input)) }),
  );
}

export async function forgotPassword(email: string) {
  const input = AuthForgotPasswordSchema.parse({ email });
  return requestJson<unknown>("/auth/forgot-password", { method: "POST", body: JSON.stringify(input) });
}

export async function getSession(): Promise<SessionActor | null> {
  try {
    const response = AuthSessionListResponseSchema.parse(
      await requestJson<unknown>("/auth/sessions?page=1&page_size=1"),
    );
    const session = response.items[0];
    if (!session) return null;
    return SessionActorSchema.parse({
      user_id: session.user_id,
      audience: session.audience,
      ...(session.company_id !== null ? { company_id: session.company_id } : {}),
      permissions: session.permissions,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    return null;
  }
}

export async function getProfile() {
  return IdentityProfileResponseSchema.parse(await requestJson<unknown>("/account/profile"));
}

export async function getAddresses() {
  return IdentityAddressListResponseSchema.parse(await requestJson<unknown>("/account/addresses"));
}

export async function getAccountOrders(query: OrderListQuery = { page: 1, page_size: 10 }) {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("page_size", String(query.page_size));
  if (query.status) params.set("status", query.status);
  if (query.channel) params.set("channel", query.channel);
  return OrderListResponseSchema.parse(await requestJson<unknown>("/orders?" + params.toString()));
}

export async function getAccountOrder(id: string) {
  return OrderMutationResponseSchema.parse(await requestJson<unknown>("/orders/" + encodeURIComponent(id)));
}

export type AccountProfile = Awaited<ReturnType<typeof getProfile>>["item"];
export type AccountAddresses = Awaited<ReturnType<typeof getAddresses>>["items"];
export type AccountOrders = Awaited<ReturnType<typeof getAccountOrders>>;
