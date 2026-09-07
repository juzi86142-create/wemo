import Link from "next/link";
import type { ReactNode } from "react";

type StatusKind = "loading" | "empty" | "error" | "forbidden";

interface StatusPanelProps {
  kind: StatusKind;
  title: string;
  description: string;
  requestId?: string | undefined;
  action?: ReactNode;
}

const roleByKind: Record<StatusKind, "status" | "alert"> = {
  loading: "status",
  empty: "status",
  error: "alert",
  forbidden: "alert",
};

export function StatusPanel({
  kind,
  title,
  description,
  requestId,
  action,
}: StatusPanelProps) {
  return (
    <section className={`status-panel status-${kind}`} role={roleByKind[kind]}>
      <span className="status-kicker">{kind === "error" ? "Something went wrong" : kind}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {requestId ? <code>Request ID: {requestId}</code> : null}
      {action ? <div className="status-action">{action}</div> : null}
    </section>
  );
}

export function BackHomeLink() {
  return <Link className="button button-secondary" href="/">Back to home</Link>;
}
