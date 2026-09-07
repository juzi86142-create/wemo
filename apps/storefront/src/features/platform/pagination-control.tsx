import Link from "next/link";

import { buildPageHref } from "./pagination";

interface PaginationProps {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  queryString: string;
}

export function Pagination({ pathname, page, pageSize, total, queryString }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link href={buildPageHref(pathname, queryString, page - 1)}>Previous</Link> : <span aria-disabled="true">Previous</span>}
      <strong>Page {page} of {pageCount}</strong>
      {page < pageCount ? <Link href={buildPageHref(pathname, queryString, page + 1)}>Next</Link> : <span aria-disabled="true">Next</span>}
    </nav>
  );
}
