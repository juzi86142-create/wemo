"use client";

import { useState } from "react";

import { ActionFeedback } from "../platform";
import type { AdminRecord } from "./admin-fixtures";

interface AdminEditorProps {
  kind: "product" | "content";
  record: AdminRecord;
}

type EditorStatus = "idle" | "pending" | "success" | "error";

export function AdminEditor({ kind, record }: AdminEditorProps) {
  const [title, setTitle] = useState(record.title);
  const [summary, setSummary] = useState(record.detail);
  const [status, setStatus] = useState<EditorStatus>("idle");

  function save() {
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  return <form className="admin-editor" onSubmit={(event) => { event.preventDefault(); save(); }}>
    <p className="eyebrow">{kind === "product" ? "PRODUCT EDITOR" : "CONTENT EDITOR"}</p>
    <h2>{record.id}</h2>
    <label className="field"><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="field"><span>{kind === "product" ? "Operations note" : "Summary"}</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
    <div className="admin-editor-actions"><button className="button button-dark" type="submit" disabled={status === "pending"}>{status === "pending" ? "Saving..." : "Save local draft"}</button><button className="text-button" type="button" onClick={() => setStatus("error")}>Show unavailable state</button></div>
    <ActionFeedback status={status} idleMessage="Changes stay in this browser demo." successMessage="Local draft saved. Live publishing is unavailable." errorMessage="Live save is unavailable. Your inputs are still preserved." />
  </form>;
}

export function AdminSettingsPanel() {
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [profile, setProfile] = useState({ name: "Jordan Lee", email: "jordan@wemove.example" });
  const [market, setMarket] = useState("United States");
  const [audit, setAudit] = useState(true);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  return <form className="admin-settings" onSubmit={save}>
    <section><p className="eyebrow">PROFILE</p><h2>Your workspace profile</h2><div className="admin-form-grid"><label className="field"><span>Name</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label className="field"><span>Email</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label></div></section>
    <section><p className="eyebrow">ROLE</p><h2>Operations manager</h2><p>Product, order, dealer, and content controls are displayed locally. Live permission checks remain server-owned.</p></section>
    <section><p className="eyebrow">MARKET</p><h2>Primary market</h2><label className="field"><span>Market</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Germany</option></select></label></section>
    <section><p className="eyebrow">AUDIT</p><h2>Audit preferences</h2><label className="check-row"><input checked={audit} type="checkbox" onChange={(event) => setAudit(event.target.checked)} />Keep local confirmation messages visible after demo actions.</label></section>
    <div className="admin-settings-actions"><button className="button button-dark" disabled={status === "pending"} type="submit">{status === "pending" ? "Saving..." : "Save local preferences"}</button><ActionFeedback status={status} idleMessage="Settings are local to this browser." successMessage="Local preferences saved." errorMessage="Preferences could not be saved." /></div>
  </form>;
}
