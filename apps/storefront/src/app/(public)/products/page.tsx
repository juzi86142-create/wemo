import type { CatalogProductListQuery } from "@wemo/contracts";

import { FilterBar, ProductCard, getPublicProducts } from "../../../features/public-site";
import { Pagination, StatusPanel, buildQueryHref } from "../../../features/platform";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const filterGroups = [
  { title: "Category", options: [["Bowling & Target", "bowling"], ["Balance & Agility", "balance"], ["Outdoor Play", "outdoor"]] },
  { title: "Age Group", options: [["Ages 2–4", "2"], ["Ages 5–7", "5"], ["Ages 8+", "8"]] },
  { title: "Environment", options: [["Indoor Living", "indoor"], ["Outdoor & Lawn", "outdoor"], ["Hybrid", "family"]] },
] as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(valueOf(params.page) ?? 1));
  const pageSize = Math.min(48, Math.max(12, Number(valueOf(params.page_size) ?? 24)));
  const query: CatalogProductListQuery = {
    page,
    page_size: pageSize,
    ...(valueOf(params.q) ? { q: valueOf(params.q) } : {}),
    ...(valueOf(params.sort) ? { sort: valueOf(params.sort) as CatalogProductListQuery["sort"] } : {}),
  };
  const data = await getPublicProducts(query);
  const currentQuery = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => value === undefined ? [] : [[key, valueOf(value) ?? ""]]),
  ).toString();

  return (
    <main className="page-main">
      <section className="page-hero page-hero-products"><p className="eyebrow">HOME / PRODUCTS</p><h1>Made for movement.</h1><p>Thoughtful sports games and physical play equipment engineered to unlock natural coordination, spatial intuition, and lifelong joy.</p><div className="catalog-metrics"><div><strong>{data.total}</strong><span>movement tools</span></div><div><strong>LIVE</strong><span>catalogue content</span></div></div></section>
      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-layout">
          <aside className="catalog-filters" aria-label="Product filters">
            <p className="eyebrow">FILTER BY</p>
            {filterGroups.map((group) => <fieldset key={group.title}><legend>{group.title}<span aria-hidden="true">−</span></legend>{group.options.map(([label, query]) => <a className={valueOf(params.q)?.toLowerCase().includes(query) ? "filter-option active" : "filter-option"} href={buildQueryHref("/products", currentQuery, { q: query, page: 1 })} key={query}><span aria-hidden="true" />{label}<small>{valueOf(params.q)?.toLowerCase().includes(query) ? "ON" : ""}</small></a>)}</fieldset>)}
            <a className="button button-dark filter-apply" href="/products">Apply filters</a>
            <a className="filter-clear" href="/products">Reset all filters</a>
          </aside>
          <div className="catalog-results">
            <div className="catalog-header"><div><p className="eyebrow">{data.total} WAYS TO PLAY</p><h2 id="catalog-title">Find your next favourite.</h2></div><span className="catalog-count">Showing page {data.page}</span></div>
            <FilterBar pathname="/products" queryString={currentQuery} search={valueOf(params.q) ?? ""} sort={valueOf(params.sort) ?? "featured"} />
            {data.error && !data.preview ? <StatusPanel kind="error" title="The catalogue is taking a break." description="We could not load products right now. Please try again shortly." requestId={data.error.requestId} action={<a className="button button-secondary" href="/products">Try again</a>} /> : data.items.length === 0 ? <StatusPanel kind="empty" title="Nothing matched that search." description="Try a broader phrase or clear the filters to see every way to play." action={<a className="button button-secondary" href="/products">View all products</a>} /> : <><>{data.preview ? <div className="preview-banner"><strong>Preview catalogue</strong><span>Live product content will appear here when the API is connected.</span></div> : null}</><div className="product-grid">{data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div><Pagination pathname="/products" page={data.page} pageSize={data.pageSize} total={data.total} queryString={currentQuery} /></>}
          </div>
        </div>
      </section>
    </main>
  );
}
