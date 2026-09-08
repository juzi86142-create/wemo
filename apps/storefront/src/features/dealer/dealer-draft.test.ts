import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DealerApplicationFormValues } from "./dealer-validation";
import { clearDealerDraft, readDealerDraft, writeDealerDraft } from "./dealer-draft";

const values: DealerApplicationFormValues = {
  legalName: "Demo Sports Ltd",
  displayName: "Demo Sports",
  country: "GB",
  website: "https://demo.example.com",
  businessType: "Retail",
  taxId: "GB123456",
  contactName: "Alex Smith",
  contactEmail: "alex@example.com",
  contactPhone: "+44 20 5555 0100",
  currency: "GBP",
};

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe("dealer application drafts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a valid draft through session storage", () => {
    const sessionStorage = createStorage();
    vi.stubGlobal("window", { sessionStorage });

    writeDealerDraft(values);

    expect(readDealerDraft()).toEqual(values);
    expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("ignores malformed JSON and schema-invalid drafts", () => {
    const sessionStorage = createStorage();
    vi.stubGlobal("window", { sessionStorage });

    sessionStorage.getItem.mockReturnValueOnce("not-json");
    expect(readDealerDraft()).toBeNull();

    sessionStorage.getItem.mockReturnValueOnce(JSON.stringify({ ...values, contactEmail: 42 }));
    expect(readDealerDraft()).toBeNull();
  });

  it("clears a saved draft after successful submission", () => {
    const sessionStorage = createStorage();
    vi.stubGlobal("window", { sessionStorage });

    writeDealerDraft(values);
    clearDealerDraft();

    expect(readDealerDraft()).toBeNull();
    expect(sessionStorage.removeItem).toHaveBeenCalledTimes(1);
  });

  it("is safe to call during server rendering", () => {
    expect(() => writeDealerDraft(values)).not.toThrow();
    expect(readDealerDraft()).toBeNull();
    expect(() => clearDealerDraft()).not.toThrow();
  });
});
