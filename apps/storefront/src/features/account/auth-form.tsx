"use client";

import Link from "next/link";
import { useState } from "react";

import { ApiError } from "../platform/api-client";
import { forgotPassword, login, register } from "./account-adapter";
import { validateAuthFields, type AuthMode, type AuthValues } from "./account-validation";

interface AuthFormProps {
  mode: AuthMode;
  onSuccess?: (message: string) => void;
}

const initialValues: AuthValues = {
  email: "",
  password: "",
  name: "",
  confirmPassword: "",
  agreeTerms: false,
  agreeMarketing: false,
};

const copy: Record<AuthMode, { eyebrow: string; title: string; description: string; submit: string }> = {
  login: { eyebrow: "WELCOME BACK", title: "Make room for play.", description: "Sign in to view your account, orders, and saved details.", submit: "Sign in" },
  register: { eyebrow: "JOIN THE MOVEMENT", title: "Create your account.", description: "Keep your details together and make your next order easier.", submit: "Create account" },
  "forgot-password": { eyebrow: "ACCOUNT ACCESS", title: "A fresh start.", description: "Enter your email and we will send a reset link if an account exists.", submit: "Send reset link" },
};

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const update = (key: keyof AuthValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError(undefined);
    setSuccess(undefined);
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAuthFields(mode, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setFormError(undefined);
    try {
      if (mode === "login") {
        await login({ email: values.email, password: values.password, audience: "user" });
        const message = "You are signed in. Your account is ready.";
        setSuccess(message);
        onSuccess?.(message);
      } else if (mode === "register") {
        await register({ email: values.email, password: values.password, name: values.name, audience: "user", agree_terms: values.agreeTerms, agree_marketing: values.agreeMarketing });
        const message = "Account created. Check your inbox to verify your email.";
        setSuccess(message);
        onSuccess?.(message);
      } else {
        await forgotPassword(values.email);
        const message = "If an account exists for that email, a reset link is on its way.";
        setSuccess(message);
        onSuccess?.(message);
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "We could not complete that request. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const labels = copy[mode];

  return (
    <div className="auth-card">
      <p className="eyebrow">{labels.eyebrow}</p>
      <h1>{labels.title}</h1>
      <p className="auth-description">{labels.description}</p>
      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === "register" ? <Field id="name" label="Name" value={values.name} error={errors.name} onChange={(value) => update("name", value)} /> : null}
        <Field id="email" label="Email address" type="email" value={values.email} error={errors.email} onChange={(value) => update("email", value)} />
        {mode !== "forgot-password" ? <Field id="password" label="Password" type="password" value={values.password} error={errors.password} onChange={(value) => update("password", value)} /> : null}
        {mode === "register" ? <Field id="confirmPassword" label="Confirm password" type="password" value={values.confirmPassword} error={errors.confirmPassword} onChange={(value) => update("confirmPassword", value)} /> : null}
        {mode === "register" ? <><label className="check-row"><input type="checkbox" checked={values.agreeTerms} onChange={(event) => update("agreeTerms", event.target.checked)} /> <span>I agree to the terms and privacy policy.</span></label>{errors.agreeTerms ? <p className="field-error">{errors.agreeTerms}</p> : null}<label className="check-row"><input type="checkbox" checked={values.agreeMarketing} onChange={(event) => update("agreeMarketing", event.target.checked)} /> <span>Send me occasional play ideas.</span></label></> : null}
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        {success ? <p className="form-success" role="status">{success}</p> : null}
        <button className="button button-dark auth-submit" type="submit" disabled={pending}>{pending ? "Working..." : labels.submit} <span aria-hidden="true">↗</span></button>
      </form>
      <div className="auth-links">{mode === "login" ? <><Link href="/register">Create an account</Link><Link href="/forgot-password">Forgot password?</Link></> : <Link href="/login">Back to sign in</Link>}</div>
    </div>
  );
}

function Field({ id, label, type = "text", value, error, onChange }: { id: string; label: string; type?: string; value: string; error: string | undefined; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={id} type={type} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? id + "-error" : undefined} onChange={(event) => onChange(event.target.value)} />{error ? <p className="field-error" id={id + "-error"}>{error}</p> : null}</div>;
}
