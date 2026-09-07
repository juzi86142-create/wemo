import { FilterBar, ProductCard, getPublicProducts } from "../../../features/public-site";
import { StatusPanel } from "../../../features/platform";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = valueOf(params.q) ?? "";
  const data = await getPublicProducts({ page: 1, page_size: 24, q: q || undefined });

  return (
    <main className="page-main">
      <section className="page-hero page-hero-search"><p className="eyebrow">LOOKING FOR SOMETHING?</p><h1>Search the ways you play.</h1><p>Start with a product, a skill, or the kind of day you want to build.</p></section>
      <section className="catalog-section search-results" aria-labelledby="search-title">
        <div className="catalog-header"><div><p className="eyebrow">SEARCH RESULTS</p><h2 id="search-title">{q ? "Results for “" + q + "”" : "Start with a search"}</h2></div></div>
        <FilterBar pathname="/search" queryString={q ? "q=" + encodeURIComponent(q) : ""} search={q} />
        {data.error && !data.preview ? <StatusPanel kind="error" title="Search is temporarily unavailable." description="Please try again in a moment." requestId={data.error.requestId} /> : data.items.length === 0 ? <StatusPanel kind="empty" title={q ? "No matches yet." : "What would you like to find?"} description="Try bowling, balance, outdoor play, or another movement idea." action={<a href="/products" className="button button-secondary">Browse products</a>} /> : <div className="product-grid">{data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
      </section>
    </main>
  );
}
