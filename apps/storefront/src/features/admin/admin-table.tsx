"use client";

import { useMemo, useState } from "react";

import { StatusPanel } from "../platform";
import type { AdminRecord } from "./admin-fixtures";
import { AdminEditor } from "./admin-editor";

interface AdminTableProps {
  title: string;
  rows: AdminRecord[];
  editorKind?: "product" | "content";
}

function statusClass(status: AdminRecord["status"]) {
  return `admin-status admin-status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

export function AdminTable({ title, rows, editorKind }: AdminTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const statuses = ["All", ...Array.from(new Set(rows.map((row) => row.status)))];
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = `${row.id} ${row.title} ${row.meta}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (status === "All" || row.status === status);
  }), [query, rows, status]);

  return (
    <section className="admin-workspace-panel" aria-labelledby={`${title.toLowerCase()}-table-heading`}>
      <div className="admin-table-toolbar">
        <div>
          <p className="eyebrow">LOCAL DATA</p>
          <h2 id={`${title.toLowerCase()}-table-heading`}>{title}</h2>
        </div>
        <label className="admin-search"><span className="sr-only">Search {title.toLowerCase()}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} /></label>
      </div>
      <div className="admin-filter-row" aria-label={`${title} filters`}>
        {statuses.map((item) => <button className={status === item ? "is-active" : undefined} type="button" onClick={() => setStatus(item)} key={item}>{item}</button>)}
      </div>
      <div className="admin-table-layout">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead><tr><th scope="col">Record</th><th scope="col">Status</th><th scope="col">Activity</th><th scope="col"><span className="sr-only">Open details</span></th></tr></thead>
            <tbody>{filteredRows.map((row) => <tr className={selected?.id === row.id ? "is-selected" : undefined} key={row.id}>
              <td><strong>{row.title}</strong><span>{row.id} · {row.meta}</span></td><td><span className={statusClass(row.status)}>{row.status}</span></td><td>{row.updated}</td><td><button className="text-button" type="button" onClick={() => setSelectedId(row.id)}>Open</button></td>
            </tr>)}</tbody>
          </table>
          {filteredRows.length === 0 ? <StatusPanel kind="empty" title="No records match these filters." description="Try a broader search or choose another status in this local demo." /> : null}
        </div>
        {selected ? <aside className="admin-detail-panel" aria-live="polite">
          {editorKind ? <AdminEditor key={selected.id} kind={editorKind} record={selected} /> : <><p className="eyebrow">{selected.id}</p><h2>{selected.title}</h2><p>{selected.detail}</p><span className={statusClass(selected.status)}>{selected.status}</span><p className="admin-detail-note">This is a controlled local demo. Live changes require the backend workspace API.</p></>}
        </aside> : null}
      </div>
    </section>
  );
}
