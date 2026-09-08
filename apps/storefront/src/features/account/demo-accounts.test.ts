import { describe, expect, it } from "vitest";

import {
  DEMO_ACCOUNTS,
  authenticateDemoAccount,
  createDemoSessionActor,
  demoAccountHomePath,
} from "./demo-accounts";

describe("demo accounts", () => {
  it("provides one working account for each demonstrable role", () => {
    expect(DEMO_ACCOUNTS.map((account) => account.audience)).toEqual(["user", "dealer", "staff"]);
    expect(new Set(DEMO_ACCOUNTS.map((account) => account.email)).size).toBe(DEMO_ACCOUNTS.length);
  });

  it("authenticates exact local credentials and rejects wrong passwords", () => {
    const account = DEMO_ACCOUNTS[1];
    expect(authenticateDemoAccount(account.email.toUpperCase(), account.password)).toEqual(account);
    expect(authenticateDemoAccount(account.email, "wrong-password")).toBeUndefined();
    expect(authenticateDemoAccount(account.email, account.password, "user")).toBeUndefined();
  });

  it("creates contract-valid role sessions with matching destinations", () => {
    expect(createDemoSessionActor(DEMO_ACCOUNTS[0])).toMatchObject({ user_id: 101, audience: "user" });
    expect(createDemoSessionActor(DEMO_ACCOUNTS[1])).toMatchObject({ user_id: 201, audience: "dealer", company_id: 401 });
    expect(demoAccountHomePath("user")).toBe("/account");
    expect(demoAccountHomePath("dealer")).toBe("/dealer");
    expect(demoAccountHomePath("staff")).toBe("/admin");
  });
});
