import { describe, expect, it } from "vitest";

import { isContractMockMode } from "./contract-mock-mode";

describe("contract mock mode", () => {
  it("only enables the notice for the explicit true value", () => {
    expect(isContractMockMode("true")).toBe(true);
    expect(isContractMockMode(undefined)).toBe(false);
    expect(isContractMockMode("false")).toBe(false);
    expect(isContractMockMode("1")).toBe(false);
  });
});
