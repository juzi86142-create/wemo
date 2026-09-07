import type { CatalogProductListQuery } from "@wemo/contracts";

import { FilterBar, ProductCard, getPublicProducts } from "../../../features/public-site";
import { Pagination, StatusPanel } from "../../../features/platform";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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
      <section className="page-hero page-hero-products"><p className="eyebrow">THE COLLECTION</p><h1>Products made to move with you.</h1><p>Simple, durable sports games for playrooms, gardens, and wherever the day takes you.</p></section>
      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-header"><div><p className="eyebrow">{data.total} WAYS TO PLAY</p><h2 id="catalog-title">Find your next favourite.</h2></div><span className="catalog-count">Page {data.page}</span></div>
        <FilterBar pathname="/products" queryString={currentQuery} search={valueOf(params.q) ?? ""} sort={valueOf(params.sort) ?? "featured"} />
        {data.error && !data.preview ? <StatusPanel kind="error" title="The catalogue is taking a break." description="We could not load products right now. Please try again shortly." requestId={data.error.requestId} action={<a className="button button-secondary" href="/products">Try again</a>} /> : data.items.length === 0 ? <StatusPanel kind="empty" title="Nothing matched that search." description="Try a broader phrase or clear the filters to see every way to play." action={<a className="button button-secondary" href="/products">View all products</a>} /> : <><>{data.preview ? <div className="preview-banner"><strong>Preview catalogue</strong><span>Live product content will appear here when the API is connected.</span></div> : null}</><div className="product-grid">{data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div><Pagination pathname="/products" page={data.page} pageSize={data.pageSize} total={data.total} queryString={currentQuery} /></>}
      </section>
    </main>
  );
}
