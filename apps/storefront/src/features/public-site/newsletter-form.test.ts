import { describe, expect, it } from "vitest";

import { validateNewsletterEmail } from "./newsletter-validation";

describe("validateNewsletterEmail", () => {
  it("rejects an invalid newsletter email", () => {
    expect(validateNewsletterEmail("bad")).toBe("Enter a valid email address.");
  });

  it("accepts a valid newsletter email", () => {
    expect(validateNewsletterEmail("hello@example.com")).toBeUndefined();
  });
});
