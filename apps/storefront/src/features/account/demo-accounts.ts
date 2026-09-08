import { SessionActorSchema, type AccountAudience, type SessionActor } from "@wemo/contracts";

export interface DemoAccount {
  id: number;
  name: string;
  roleLabel: string;
  email: string;
  password: string;
  audience: AccountAudience;
  companyId?: number;
  permissions: readonly string[];
}

export const DEMO_ACCOUNTS = [
  {
    id: 101,
    name: "Alex Taylor",
    roleLabel: "Customer",
    email: "alex@wemove.demo",
    password: "play1234",
    audience: "user",
    permissions: [],
  },
  {
    id: 201,
    name: "Morgan Hayes",
    roleLabel: "Dealer",
    email: "morgan@wemove.demo",
    password: "dealer1234",
    audience: "dealer",
    companyId: 401,
    permissions: ["catalog:dealer_read", "orders:company_read", "quotes:company_write"],
  },
  {
    id: 301,
    name: "Olivia Chen",
    roleLabel: "Administrator",
    email: "olivia@wemove.demo",
    password: "admin1234",
    audience: "staff",
    permissions: ["catalog:write", "orders:read", "content:write"],
  },
] as const satisfies readonly DemoAccount[];

const demoSessionStorageKey = "wemo:demo-session";
const demoSessionChangeEvent = "wemo:demo-session-change";

export function authenticateDemoAccount(
  email: string,
  password: string,
  audience?: AccountAudience,
): DemoAccount | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(
    (account) =>
      account.email === normalizedEmail &&
      account.password === password &&
      (!audience || account.audience === audience),
  );
}

export function createDemoSessionActor(account: DemoAccount): SessionActor {
  return SessionActorSchema.parse({
    user_id: account.id,
    audience: account.audience,
    ...(account.companyId ? { company_id: account.companyId } : {}),
    permissions: [...account.permissions],
  });
}

export function demoAccountHomePath(audience: AccountAudience) {
  if (audience === "dealer") return "/dealer";
  if (audience === "staff") return "/admin";
  return "/account";
}

export function storeDemoSession(account: DemoAccount) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(demoSessionStorageKey, account.email);
  window.dispatchEvent(new Event(demoSessionChangeEvent));
}

export function readDemoSession(): DemoAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const email = window.localStorage.getItem(demoSessionStorageKey);
    return DEMO_ACCOUNTS.find((account) => account.email === email) ?? null;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(demoSessionStorageKey);
  window.dispatchEvent(new Event(demoSessionChangeEvent));
}

export function subscribeToDemoSession(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(demoSessionChangeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(demoSessionChangeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
