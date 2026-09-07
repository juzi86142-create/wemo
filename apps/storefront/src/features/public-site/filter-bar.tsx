import Link from "next/link";

import { buildQueryHref } from "../platform";

interface FilterBarProps {
  pathname: string;
  queryString: string;
  search?: string;
  sort?: string;
}

export function FilterBar({ pathname, queryString, search = "", sort = "featured" }: FilterBarProps) {
  const clearHref = pathname;
  const sortHref = (value: string) => buildQueryHref(pathname, queryString, { sort: value, page: 1 });

  return (
    <div className="filter-bar">
      <form className="search-form" action={pathname} method="get">
        <label htmlFor="catalog-search">Search products</label>
        <div className="search-input-wrap">
          <input id="catalog-search" name="q" defaultValue={search} placeholder="Try bowling, balance..." />
          <button className="icon-button" type="submit" aria-label="Search products">↗</button>
        </div>
      </form>
      <div className="filter-actions">
        <span className="filter-label">Sort</span>
        <Link className={sort === "featured" ? "filter-chip active" : "filter-chip"} href={sortHref("featured")}>Featured</Link>
        <Link className={sort === "newest" ? "filter-chip active" : "filter-chip"} href={sortHref("newest")}>New</Link>
        <Link className={sort === "name_asc" ? "filter-chip active" : "filter-chip"} href={sortHref("name_asc")}>A–Z</Link>
        <Link className="filter-reset" href={clearHref}>Clear</Link>
      </div>
    </div>
  );
}
