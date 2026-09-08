"use client";

import type { ReactNode } from "react";

export type ActionFeedbackStatus = "idle" | "pending" | "success" | "error";

interface ActionFeedbackProps {
  status: ActionFeedbackStatus;
  pendingMessage?: ReactNode;
  successMessage?: ReactNode;
  errorMessage?: ReactNode;
  idleMessage?: ReactNode;
}

export function ActionFeedback({
  status,
  pendingMessage = "Saving...",
  successMessage = "Saved.",
  errorMessage = "Something went wrong.",
  idleMessage,
}: ActionFeedbackProps) {
  const message = {
    idle: idleMessage,
    pending: pendingMessage,
    success: successMessage,
    error: errorMessage,
  }[status];

  if (message === undefined || message === null) return null;

  return (
    <span
      className={`action-feedback action-feedback-${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
    >
      {message}
    </span>
  );
}
