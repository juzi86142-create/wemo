import Link from "next/link";

import { DealerListingCard, getPublicDealerListings } from "../../../features/dealer";
import { StatusPanel } from "../../../features/platform";

type SearchParams = Record<string, string | string[] | undefined>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DealersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const country = valueOf(params.country)?.trim();
  const data = await getPublicDealerListings({
    page: 1,
    page_size: 20,
    ...(country ? { country } : {}),
  });

  return (
    <main className="dealer-page">
      <section className="page-hero page-hero-dealers">
        <p className="eyebrow">HOME / DEALERS</p>
        <h1>Find a better way to move.</h1>
        <p>Meet the authorised partners bringing WEMOVE play instruments closer to families, schools, and thoughtful spaces.</p>
      </section>
      <section className="dealer-discovery" aria-labelledby="dealer-list-title">
        <aside className="dealer-guide">
          <p className="eyebrow">A CLOSER LOOK</p>
          <h2>Find the right place to start.</h2>
          <p>Search the current public partner list, or tell us about your business if you would like to bring WEMOVE to more families.</p>
          <Link className="button button-dark" href="/dealers/apply">Become a dealer <span aria-hidden="true">↗</span></Link>
          <div className="dealer-guide-mark" aria-hidden="true">W</div>
        </aside>
        <div className="dealer-results">
          <div className="dealer-results-heading">
            <div><p className="eyebrow">PUBLIC PARTNERS</p><h2 id="dealer-list-title">{data.total} places to explore.</h2></div>
            <span>{data.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
          </div>
          <form className="dealer-filter" action="/dealers" method="get">
            <label htmlFor="dealer-country">Country or region</label>
            <select id="dealer-country" name="country" defaultValue={country ?? ""}>
              <option value="">All regions</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
            <button className="button button-secondary" type="submit">Filter</button>
            {country ? <Link className="filter-clear" href="/dealers">Clear</Link> : null}
          </form>
          {data.error ? <StatusPanel kind="error" title="The dealer network is taking a break." description="We could not load public partners right now. Please try again shortly." requestId={data.error.requestId} action={<Link className="button button-secondary" href={country ? "/dealers?country=" + encodeURIComponent(country) : "/dealers"}>Try again</Link>} /> : data.items.length === 0 ? <StatusPanel kind="empty" title="No partners in that region yet." description="Try another region or tell us about your business." action={<Link className="button button-secondary" href="/dealers/apply">Become a dealer</Link>} /> : <div className="dealer-listing-grid">{data.items.map((listing) => <DealerListingCard key={listing.company.id} listing={listing} />)}</div>}
        </div>
      </section>
    </main>
  );
}
