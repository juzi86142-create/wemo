import { describe, expect, it } from "vitest";

import { readDemoValue, writeDemoValue } from "./demo-storage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("demo storage", () => {
  it("round-trips namespaced JSON and returns the fallback for malformed data", () => {
    const storage = createMemoryStorage();

    writeDemoValue(storage, "account", "profile", { name: "Alex" });
    expect(readDemoValue(storage, "account", "profile", null)).toEqual({ name: "Alex" });

    storage.setItem("wemo:demo:account:profile", "bad-json");
    expect(readDemoValue(storage, "account", "profile", null)).toBeNull();
  });
});
