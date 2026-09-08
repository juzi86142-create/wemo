import { describe, expect, it } from "vitest";

import {
  createAccountDemoState,
  createDemoAddressId,
  removeDemoAddress,
  upsertDemoAddress,
  updateDemoProfile,
  validateAccountDemoState,
} from "./account-demo-state";

describe("account demo state", () => {
  it("updates a profile and removes an address in demo state", () => {
    const state = createAccountDemoState();
    expect(updateDemoProfile(state, { name: "Alex Green", phone: "123" }).profile.name).toBe("Alex Green");
    expect(removeDemoAddress(state, "address-1").addresses.some((item) => item.id === "address-1")).toBe(false);
  });

  it("keeps two newly added addresses with distinct IDs", () => {
    const initial = createAccountDemoState({ addresses: [] });
    const firstId = createDemoAddressId(initial, "address-new");
    const afterFirst = upsertDemoAddress(initial, {
      id: firstId,
      kind: "Home",
      recipient: "Alex",
      line1: "1 Main",
      line2: "",
      city: "Portland",
      region: "OR",
      postalCode: "97205",
      country: "United States",
      isDefault: true,
    });
    const secondId = createDemoAddressId(afterFirst, "address-new");
    const firstAddress = afterFirst.addresses[0];
    expect(firstAddress).toBeDefined();
    const afterSecond = upsertDemoAddress(afterFirst, { ...firstAddress!, id: secondId, line1: "2 Main" });

    expect(secondId).not.toBe(firstId);
    expect(afterSecond.addresses).toHaveLength(2);
  });

  it("rejects valid JSON with an invalid account state shape", () => {
    const fallback = createAccountDemoState();

    expect(validateAccountDemoState({}, fallback)).toBe(fallback);
    expect(validateAccountDemoState({ addresses: "not-an-array" }, fallback)).toBe(fallback);
  });
});
