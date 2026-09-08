import { describe, expect, it } from "vitest";

import {
  createAccountDemoState,
  removeDemoAddress,
  updateDemoProfile,
} from "./account-demo-state";

describe("account demo state", () => {
  it("updates a profile and removes an address in demo state", () => {
    const state = createAccountDemoState();
    expect(updateDemoProfile(state, { name: "Alex Green", phone: "123" }).profile.name).toBe("Alex Green");
    expect(removeDemoAddress(state, "address-1").addresses.some((item) => item.id === "address-1")).toBe(false);
  });
});
