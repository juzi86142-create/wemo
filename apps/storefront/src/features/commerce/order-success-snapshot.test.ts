import { afterEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@wemo/contracts";

import {
  clearOrderSuccessSnapshot,
  consumeOrderSuccessSnapshot,
  readOrderSuccessSnapshot,
  writeOrderSuccessSnapshot,
} from "./order-success-snapshot";

const order: Order = {
  id: 901,
  order_no: "WEMO-20260908-0001",
  channel: "b2c",
  user_id: null,
  company_id: null,
  currency: "USD",
  subtotal_minor: 3200,
  tax_minor: 0,
  shipping_minor: 0,
  total_minor: 3200,
  status: "pending_payment",
  address_snapshot: {},
  pricing_snapshot: {},
  items: [],
  status_history: [],
  created_at: "2026-09-08T00:00:00.000Z",
  updated_at: "2026-09-08T00:00:00.000Z",
};

function installStorage(initial = "") {
  let value = initial;
  const sessionStorage = {
    getItem: vi.fn(() => value || null),
    setItem: vi.fn((_key: string, next: string) => { value = next; }),
    removeItem: vi.fn(() => { value = ""; }),
  };
  vi.stubGlobal("window", { sessionStorage });
  return sessionStorage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("order success snapshot", () => {
  it("round-trips a validated order through session storage", () => {
    installStorage();
    writeOrderSuccessSnapshot(order);
    expect(readOrderSuccessSnapshot()).toEqual(order);
  });

  it("returns null for malformed or schema-invalid storage", () => {
    installStorage("not-json");
    expect(readOrderSuccessSnapshot()).toBeNull();

    installStorage(JSON.stringify({ order_no: "missing-fields" }));
    expect(readOrderSuccessSnapshot()).toBeNull();
  });

  it("clears the snapshot and is safe without a browser window", () => {
    const storage = installStorage(JSON.stringify(order));
    clearOrderSuccessSnapshot();
    expect(storage.removeItem).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
    expect(readOrderSuccessSnapshot()).toBeNull();
    expect(() => clearOrderSuccessSnapshot()).not.toThrow();
  });

  it("consumes the stored order snapshot once", () => {
    const storage = installStorage(JSON.stringify(order));

    expect(consumeOrderSuccessSnapshot()).toEqual(order);
    expect(consumeOrderSuccessSnapshot()).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });
});
