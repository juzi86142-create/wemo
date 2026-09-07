export type AuthMode = "login" | "register" | "forgot-password";

export interface AuthValues {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreeMarketing: boolean;
}

export function validateAuthFields(mode: AuthMode, values: AuthValues) {
  const errors: Record<string, string> = {};
  if (!values.email.trim() || !values.email.includes("@")) errors.email = "Enter a valid email address.";
  if (mode !== "forgot-password" && values.password.length < 8) errors.password = "Use at least 8 characters.";
  if (mode === "register") {
    if (!values.name.trim()) errors.name = "Enter your name.";
    if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (!values.agreeTerms) errors.agreeTerms = "Please accept the terms to continue.";
  }
  return errors;
}
