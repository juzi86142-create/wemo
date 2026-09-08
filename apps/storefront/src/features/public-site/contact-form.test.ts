import { describe, expect, it } from "vitest";

import { validateContactForm } from "./contact-validation";

describe("validateContactForm", () => {
  it("requires a valid contact email and message", () => {
    expect(validateContactForm({ name: "", email: "bad", message: "" })).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      message: expect.any(String),
    });
  });

  it("accepts complete contact details", () => {
    expect(validateContactForm({ name: "Alex Green", email: "alex@example.com", message: "Hello" })).toEqual({});
  });
});
