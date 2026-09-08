"use client";

import { useState } from "react";

import { ActionFeedback, type ActionFeedbackStatus } from "../platform";
import { type ContactFormErrors, type ContactFormValues, validateContactForm } from "./contact-validation";

const initialValues: ContactFormValues = { name: "", email: "", message: "" };
export function ContactForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<ActionFeedbackStatus>("idle");

  function update(field: keyof ContactFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status === "error") setStatus("idle");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContactForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      return;
    }
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  return (
    <form className="contact-form" onSubmit={submit} noValidate>
      <div className="contact-form-heading"><p className="eyebrow">CONTACT FORM</p><p>Share a little context and we{"'"}ll have the right demo response ready.</p></div>
      <div className="contact-form-grid">
        <div className="contact-field"><label htmlFor="contact-name">Name</label><input id="contact-name" value={values.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} />{errors.name ? <span className="field-error" id="contact-name-error">{errors.name}</span> : null}</div>
        <div className="contact-field"><label htmlFor="contact-email">Email</label><input id="contact-email" type="email" value={values.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} />{errors.email ? <span className="field-error" id="contact-email-error">{errors.email}</span> : null}</div>
        <div className="contact-field contact-field-wide"><label htmlFor="contact-message">Message</label><textarea id="contact-message" rows={5} value={values.message} onChange={(event) => update("message", event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} />{errors.message ? <span className="field-error" id="contact-message-error">{errors.message}</span> : null}</div>
      </div>
      <div className="contact-form-actions"><button className="button button-light" type="submit" disabled={status === "pending"}>{status === "pending" ? "Preparing..." : "Send a demo message"} <span aria-hidden="true">↗</span></button><ActionFeedback status={status} idleMessage="Live support is unavailable in preview mode." pendingMessage="Preparing your local demo message..." successMessage="Demo message prepared. Nothing was sent to a live support endpoint." errorMessage="Check the highlighted fields. Your message is still here." /></div>
    </form>
  );
}
