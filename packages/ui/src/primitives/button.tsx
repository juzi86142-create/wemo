import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  children,
  disabled,
  loading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      data-loading={loading || undefined}
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
