export function listResponse<T>(
  items: T[],
  page = 1,
  pageSize = Math.max(items.length, 1),
) {
  return {
    items,
    page,
    page_size: pageSize,
    total: items.length,
  };
}
