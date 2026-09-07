import { OrderSchema, type Order } from "@wemo/contracts";

const ORDER_SUCCESS_SNAPSHOT_KEY = "wemo_checkout_order_snapshot";

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function writeOrderSuccessSnapshot(order: Order) {
  const target = storage();
  if (!target) return;

  const parsed = OrderSchema.parse(order);
  try {
    target.setItem(ORDER_SUCCESS_SNAPSHOT_KEY, JSON.stringify(parsed));
  } catch {
    // Session storage is optional; the success route has an explicit empty state.
  }
}

export function readOrderSuccessSnapshot(): Order | null {
  const target = storage();
  if (!target) return null;

  try {
    const raw = target.getItem(ORDER_SUCCESS_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = OrderSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearOrderSuccessSnapshot() {
  const target = storage();
  if (!target) return;

  try {
    target.removeItem(ORDER_SUCCESS_SNAPSHOT_KEY);
  } catch {
    // Session storage is optional.
  }
}

export function consumeOrderSuccessSnapshot(): Order | null {
  const snapshot = readOrderSuccessSnapshot();
  if (!snapshot) return null;

  clearOrderSuccessSnapshot();
  return snapshot;
}
