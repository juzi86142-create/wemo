export interface PageParams {
  page: number;
  pageSize: number;
  q?: string;
  sort?: string;
}

export function parsePageParams(searchParams: URLSearchParams): PageParams {
  const pageValue = Number(searchParams.get("page") ?? 1);
  const pageSizeValue = Number(searchParams.get("pageSize") ?? 24);
  const result: PageParams = {
    page: Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1,
    pageSize: Number.isFinite(pageSizeValue)
      ? Math.min(48, Math.max(12, Math.floor(pageSizeValue)))
      : 24,
  };
  const query = searchParams.get("q");
  const sort = searchParams.get("sort");

  if (query) result.q = query;
  if (sort) result.sort = sort;
  return result;
}

export function buildPageHref(
  pathname: string,
  queryString: string,
  page: number,
) {
  const query = new URLSearchParams(queryString);
  query.set("page", String(Math.max(1, page)));
  return `${pathname}?${query.toString()}`;
}

export function buildQueryHref(
  pathname: string,
  currentQuery: string,
  changes: Record<string, string | number | null | undefined>,
) {
  const query = new URLSearchParams(currentQuery);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || String(value).length === 0) {
      query.delete(key);
    } else {
      query.set(key, String(value));
    }
  }

  const serialized = query.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
