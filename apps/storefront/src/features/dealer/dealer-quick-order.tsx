"use client";

import { useState } from "react";

import { ActionFeedback } from "../platform";
import { validateQuickOrderRows, type QuickOrderErrors, type QuickOrderRow } from "./dealer-fixtures";

export { validateQuickOrderRows, type QuickOrderErrors, type QuickOrderRow } from "./dealer-fixtures";

const emptyRow = (): QuickOrderRow => ({ sku: "", quantity: 1 });

export function DealerQuickOrder() {
  const [rows, setRows] = useState<QuickOrderRow[]>([emptyRow()]);
  const [errors, setErrors] = useState<QuickOrderErrors>({});
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  function updateRow(index: number, field: keyof QuickOrderRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: field === "quantity" ? Number(value) : value } : row));
    setErrors((current) => ({ ...current, [index]: { ...current[index], [field]: undefined } }));
  }

  function submit() {
    const nextErrors = validateQuickOrderRows(rows);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) { setStatus("error"); return; }
    setStatus("pending");
    window.setTimeout(() => setStatus("success"), 350);
  }

  function clear() { setRows([emptyRow()]); setErrors({}); setStatus("idle"); }

  return <section className="dealer-workspace-panel dealer-quick-order" aria-labelledby="quick-order-heading">
    <div className="dealer-panel-heading"><div><p className="eyebrow">LOCAL ORDER DRAFT</p><h2 id="quick-order-heading">Build a quick order</h2></div><button className="text-button" type="button" onClick={clear}>Clear rows</button></div>
    <p className="dealer-panel-copy">Enter the product SKU and requested quantity. The local demo validates your draft; it does not create a live cart.</p>
    <div className="dealer-quick-order-rows">{rows.map((row, index) => <div className="dealer-quick-order-row" key={index}>
      <label className="field"><span>SKU</span><input value={row.sku} aria-invalid={Boolean(errors[index]?.sku)} aria-describedby={errors[index]?.sku ? `sku-error-${index}` : undefined} onChange={(event) => updateRow(index, "sku", event.target.value)} placeholder="WM-201" />{errors[index]?.sku ? <small id={`sku-error-${index}`}>{errors[index]?.sku}</small> : null}</label>
      <label className="field"><span>Quantity</span><input min="1" value={Number.isFinite(row.quantity) ? row.quantity : ""} aria-invalid={Boolean(errors[index]?.quantity)} aria-describedby={errors[index]?.quantity ? `quantity-error-${index}` : undefined} type="number" onChange={(event) => updateRow(index, "quantity", event.target.value)} />{errors[index]?.quantity ? <small id={`quantity-error-${index}`}>{errors[index]?.quantity}</small> : null}</label>
      <button className="text-button" type="button" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>
    </div>)}</div>
    <div className="dealer-quick-order-actions"><button className="button button-secondary" type="button" onClick={() => setRows((current) => [...current, emptyRow()])}>Add row</button><button className="button button-dark" type="button" disabled={status === "pending"} onClick={submit}>{status === "pending" ? "Adding..." : "Add all to cart"}</button></div>
    <ActionFeedback status={status} idleMessage="This browser-only draft is ready for SKU entry." successMessage="Local cart draft updated. Live cart creation is unavailable." errorMessage={Object.keys(errors).length > 0 ? "Fix the highlighted order rows before adding them." : "The local cart action is unavailable."} />
  </section>;
}
