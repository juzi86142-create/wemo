export function normalizeQuantity(value: number, min = 1, max = 99) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
