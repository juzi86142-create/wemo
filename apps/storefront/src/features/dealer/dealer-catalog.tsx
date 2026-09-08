"use client";

import { useMemo, useState } from "react";

import { ActionFeedback, StatusPanel } from "../platform";
import { dealerCatalogProducts, type DealerCatalogProduct } from "./dealer-fixtures";

function stockClass(stock: DealerCatalogProduct["stock"]) {
  return `dealer-status dealer-status-${stock.toLowerCase().replaceAll(" ", "-")}`;
}

export function DealerCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const categories = ["All", ...Array.from(new Set(dealerCatalogProducts.map((product) => product.category)))];
  const products = useMemo(() => dealerCatalogProducts.filter((product) => {
    const matchesQuery = `${product.sku} ${product.title} ${product.metadata}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === "All" || product.category === category);
  }), [category, query]);

  return <section className="dealer-workspace-panel" aria-labelledby="dealer-catalog-heading">
    <div className="dealer-table-toolbar"><div><p className="eyebrow">DEALER ASSORTMENT</p><h2 id="dealer-catalog-heading">Order-ready products</h2></div><label className="dealer-search"><span className="sr-only">Search dealer catalog</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU or product" /></label></div>
    <div className="dealer-filter-row" aria-label="Catalog categories">{categories.map((item) => <button className={category === item ? "is-active" : undefined} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
    {products.length === 0 ? <StatusPanel kind="empty" title="No catalog lines match." description="Try a broader search or another local category filter." /> : <div className="dealer-catalog-grid">{products.map((product) => <article className="dealer-catalog-card" key={product.sku}>
      <div><p className="eyebrow">{product.sku}</p><h3>{product.title}</h3><p>{product.metadata}</p></div>
      <dl><div><dt>Category</dt><dd>{product.category}</dd></div><div><dt>MOQ</dt><dd>{product.moq} units</dd></div><div><dt>Stock</dt><dd><span className={stockClass(product.stock)}>{product.stock}</span></dd></div></dl>
      <button className="button button-secondary" type="button" onClick={() => setStatus("error")}>Check live allocation</button>
    </article>)}</div>}
    <ActionFeedback status={status} idleMessage="Inventory is displayed from local demo fixtures." errorMessage="Live allocation is unavailable. Confirm stock with your account contact." />
  </section>;
}
