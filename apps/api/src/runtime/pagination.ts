/** 内存列表分页 按相等条件过滤后切片返回统一分页结构 */
export function paginate<T>(
  items: T[],
  query: { page: number; page_size: number },
  options?: {
    exact?: Partial<Record<keyof T, unknown>>;
    sortBy?: (a: T, b: T) => number;
  },
): { items: T[]; total: number; page: number; page_size: number } {
  let filtered = items;
  if (options?.exact) {
    for (const [field, value] of Object.entries(options.exact)) {
      if (value !== undefined) {
        filtered = filtered.filter((item) => item[field as keyof T] === value);
      }
    }
  }
  if (options?.sortBy) {
    filtered = [...filtered].sort(options.sortBy);
  }
  const start = (query.page - 1) * query.page_size;
  return {
    items: filtered.slice(start, start + query.page_size),
    total: filtered.length,
    page: query.page,
    page_size: query.page_size,
  };
}
