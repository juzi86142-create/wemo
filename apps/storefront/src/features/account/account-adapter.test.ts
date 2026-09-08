import { describe, expect, it } from "vitest";

import { login } from "./account-adapter";

describe("account adapter demo login", () => {
  it("returns the role attached to a valid local account", async () => {
    const session = await login({ email: "morgan@wemove.demo", password: "dealer1234" });
    expect(session).toMatchObject({ user_id: 201, audience: "dealer", company_id: 401 });
  });

  it("rejects credentials that do not match a local demo account", async () => {
    await expect(login({ email: "alex@wemove.demo", password: "wrong" })).rejects.toEqual(
      expect.objectContaining({ status: 401 }),
    );
  });
});
