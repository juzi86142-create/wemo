"use client";

import { useState } from "react";

import { ActionFeedback, type ActionFeedbackStatus } from "../platform";
import { validateNewsletterEmail } from "./newsletter-validation";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<ActionFeedbackStatus>("idle");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = validateNewsletterEmail(email);
    setError(nextError);
    if (nextError) {
      setStatus("error");
      return;
    }
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  return <form className="footer-signup-form" onSubmit={submit} noValidate><div className="footer-signup-row"><label className="sr-only" htmlFor="footer-email">Email address</label><input id="footer-email" type="email" placeholder="Enter email address" value={email} onChange={(event) => { setEmail(event.target.value); setError(undefined); if (status === "error") setStatus("idle"); }} aria-invalid={Boolean(error)} aria-describedby={error ? "footer-email-error" : undefined} /><button type="submit" disabled={status === "pending"}>{status === "pending" ? "..." : "Join"}</button></div>{error ? <span className="field-error" id="footer-email-error">{error}</span> : null}<ActionFeedback status={status} idleMessage="Preview signup: live newsletter delivery is unavailable." pendingMessage="Preparing local signup..." successMessage="Demo signup recorded. No live email was subscribed." errorMessage="Enter a valid email address." /></form>;
}
