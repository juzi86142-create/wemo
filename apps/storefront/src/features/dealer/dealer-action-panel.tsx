"use client";

import { useMemo, useState } from "react";

import { ActionFeedback, StatusPanel } from "../platform";
import { getDealerActionSelection, type DealerActionRecord } from "./dealer-fixtures";

interface DealerActionPanelProps {
  kind: "quotes" | "orders";
  rows: DealerActionRecord[];
}

function statusClass(status: DealerActionRecord["status"]) {
  return `dealer-status dealer-status-${status.toLowerCase()}`;
}

export function DealerActionPanel({ kind, rows }: DealerActionPanelProps) {
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const statuses = ["All", ...Array.from(new Set(rows.map((row) => row.status)))];
  const { filtered, selected } = useMemo(() => getDealerActionSelection(rows, filter, selectedId), [filter, rows, selectedId]);
  const action = kind === "quotes" ? selected?.status === "Expired" ? "Request new quote" : selected?.status === "Accepted" ? "Add quote to draft" : "Contact account support" : selected?.status === "Delivered" ? "Create reorder draft" : "Get order support";

  function runAction() { setStatus("pending"); window.setTimeout(() => setStatus("success"), 350); }

  function changeFilter(nextFilter: string) {
    const nextSelection = getDealerActionSelection(rows, nextFilter, "").selected;
    setFilter(nextFilter);
    setSelectedId(nextSelection?.id ?? "");
    setStatus("idle");
  }

  return <section className="dealer-workspace-panel" aria-labelledby={`dealer-${kind}-heading`}>
    <div className="dealer-table-toolbar"><div><p className="eyebrow">LOCAL {kind.toUpperCase()}</p><h2 id={`dealer-${kind}-heading`}>{kind === "quotes" ? "Terms worth reviewing" : "Orders in motion"}</h2></div></div>
    <div className="dealer-filter-row" aria-label={`${kind} status filters`}>{statuses.map((item) => <button className={filter === item ? "is-active" : undefined} type="button" onClick={() => changeFilter(item)} key={item}>{item}</button>)}</div>
    {filtered.length === 0 ? <StatusPanel kind="empty" title={`No ${kind} match this filter.`} description="Choose another status to inspect the local demo records." /> : <div className="dealer-action-layout"><div className="dealer-action-list">{filtered.map((row) => <button className={selected?.id === row.id ? "is-selected" : undefined} type="button" onClick={() => setSelectedId(row.id)} key={row.id}><span>{row.id}</span><strong>{row.title}</strong><em>{row.updated}</em><b className={statusClass(row.status)}>{row.status}</b></button>)}</div>{selected ? <aside className="dealer-detail-panel" aria-live="polite"><p className="eyebrow">{selected.id}</p><h3>{selected.title}</h3><span className={statusClass(selected.status)}>{selected.status}</span><p>{selected.detail}</p><button className="button button-dark" type="button" disabled={status === "pending"} onClick={runAction}>{status === "pending" ? "Working..." : action}</button><ActionFeedback status={status} idleMessage="Actions remain local while the dealer API is disconnected." successMessage="Local demo action recorded. Confirm the live outcome with your account contact." errorMessage="That live action is unavailable." /></aside> : null}</div>}
  </section>;
}
