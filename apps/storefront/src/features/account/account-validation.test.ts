import { describe, expect, it } from "vitest";

import { validateAuthFields, type AuthValues } from "./account-validation";

const emptyValues: AuthValues = {
  email: "",
  password: "",
  name: "",
  confirmPassword: "",
  agreeTerms: false,
  agreeMarketing: false,
};

describe("validateAuthFields", () => {
  it("requires the registration fields", () => {
    expect(validateAuthFields("register", emptyValues)).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
      name: expect.any(String),
      agreeTerms: expect.any(String),
    });
  });

  it("accepts a valid login", () => {
    expect(validateAuthFields("login", { ...emptyValues, email: "a@b.com", password: "password" })).toEqual({});
  });
});
