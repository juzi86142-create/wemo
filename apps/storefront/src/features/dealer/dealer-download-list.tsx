"use client";

import { useState } from "react";

import { ActionFeedback } from "../platform";
import { dealerDownloads } from "./dealer-fixtures";

export function DealerDownloadList() {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  function downloadDemoFile(title: string) {
    setActiveFile(title);
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  return <section className="dealer-workspace-panel" aria-labelledby="downloads-heading"><p className="eyebrow">DEALER RESOURCES</p><h2 id="downloads-heading">Downloads and access</h2><div className="dealer-download-list">{dealerDownloads.map((file) => <article key={file.title}><div><strong>{file.title}</strong><span>{file.detail}</span></div><b className={file.access === "Permitted" ? "dealer-status dealer-status-in-stock" : "dealer-status dealer-status-unavailable"}>{file.access}</b><div className="dealer-download-action"><button className="text-button" type="button" disabled={file.access !== "Permitted" || (activeFile === file.title && status === "pending")} onClick={() => downloadDemoFile(file.title)}>{file.access === "Permitted" ? status === "pending" && activeFile === file.title ? "Preparing..." : "Download demo file" : "Request access"}</button>{activeFile === file.title ? <ActionFeedback status={status} pendingMessage="Preparing local demo file..." successMessage="Demo file ready locally. No live file was downloaded." errorMessage="The demo file is unavailable." /> : null}</div></article>)}</div><p className="dealer-panel-copy">Download buttons are visible demo states. Live permissions and files are provided by the dealer backend.</p></section>;
}
