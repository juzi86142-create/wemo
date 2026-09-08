import type { DealerApplicationFormValues } from "./dealer-validation";

const DEALER_DRAFT_KEY = "wemo:dealer-application:draft";
const DRAFT_FIELDS: Array<keyof DealerApplicationFormValues> = [
  "legalName",
  "displayName",
  "country",
  "website",
  "businessType",
  "taxId",
  "contactName",
  "contactEmail",
  "contactPhone",
  "currency",
];

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function isDraft(value: unknown): value is DealerApplicationFormValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return DRAFT_FIELDS.every((field) => typeof source[field] === "string");
}

export function writeDealerDraft(values: DealerApplicationFormValues) {
  const target = storage();
  if (!target) return;

  try {
    target.setItem(DEALER_DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Storage can be unavailable in private browsing or when its quota is full.
  }
}

export function readDealerDraft(): DealerApplicationFormValues | null {
  const target = storage();
  if (!target) return null;

  try {
    const raw = target.getItem(DEALER_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDealerDraft() {
  const target = storage();
  if (!target) return;

  try {
    target.removeItem(DEALER_DRAFT_KEY);
  } catch {
    // Storage can be unavailable in private browsing.
  }
}
