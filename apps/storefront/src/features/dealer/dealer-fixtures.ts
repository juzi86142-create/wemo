export interface DealerNavItem {
  href: "/dealer" | "/dealer/catalog" | "/dealer/quick-order" | "/dealer/quotes" | "/dealer/orders" | "/dealer/company" | "/dealer/downloads";
  label: string;
}

export interface DealerCatalogProduct {
  sku: string;
  title: string;
  category: "Active play" | "Outdoor play" | "Team play";
  metadata: string;
  moq: number;
  stock: "In stock" | "Limited" | "Unavailable";
}

export interface DealerActionRecord {
  id: string;
  title: string;
  status: "Draft" | "Pending" | "Accepted" | "Expired" | "Processing" | "Shipped" | "Delivered";
  detail: string;
  updated: string;
}

export function getDealerActionSelection(rows: DealerActionRecord[], filter: string, selectedId: string) {
  const filtered = rows.filter((row) => filter === "All" || row.status === filter);
  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0];
  return { filtered, selected };
}

export interface QuickOrderRow {
  sku: string;
  quantity: number;
}

export type QuickOrderErrors = Record<number, Partial<Record<keyof QuickOrderRow, string>>>;

export function validateQuickOrderRows(rows: QuickOrderRow[]): QuickOrderErrors {
  return rows.reduce<QuickOrderErrors>((errors, row, index) => {
    const issue: QuickOrderErrors[number] = {};
    if (!row.sku.trim()) issue.sku = "Enter a SKU.";
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) issue.quantity = "Enter a quantity.";
    if (Object.keys(issue).length > 0) errors[index] = issue;
    return errors;
  }, {});
}

export const dealerCompany = {
  name: "Northline Play Co.",
  status: "Approved dealer",
  region: "Pacific Northwest",
  contact: "Morgan Hayes",
};

export const dealerNav: DealerNavItem[] = [
  { href: "/dealer", label: "Overview" },
  { href: "/dealer/catalog", label: "Catalog" },
  { href: "/dealer/quick-order", label: "Quick order" },
  { href: "/dealer/quotes", label: "Quotes" },
  { href: "/dealer/orders", label: "Orders" },
  { href: "/dealer/company", label: "Company" },
  { href: "/dealer/downloads", label: "Downloads" },
];

export const dealerMetrics = [
  { label: "Open orders", value: "3", detail: "One leaves this week", tone: "blue" },
  { label: "Active quotes", value: "2", detail: "Review terms locally", tone: "coral" },
  { label: "Catalog lines", value: "24", detail: "Demo assortment", tone: "lime" },
];

export const dealerCatalogProducts: DealerCatalogProduct[] = [
  { sku: "WM-201", title: "Roll & Play Bowling Set", category: "Active play", metadata: "Set of 6 pins with ball", moq: 6, stock: "In stock" },
  { sku: "WM-118", title: "Balance Trail Kit", category: "Outdoor play", metadata: "Modular balance course", moq: 4, stock: "Limited" },
  { sku: "WM-312", title: "Team Toss Markers", category: "Team play", metadata: "24 durable field markers", moq: 12, stock: "In stock" },
  { sku: "WM-246", title: "Move More Cones", category: "Active play", metadata: "Stackable indoor-outdoor cones", moq: 8, stock: "Unavailable" },
];

export const dealerQuotes: DealerActionRecord[] = [
  { id: "Q-2481", title: "Autumn school assortment", status: "Accepted", detail: "36 units across three active-play lines.", updated: "Accepted Sep 5" },
  { id: "Q-2484", title: "Community field day", status: "Pending", detail: "Awaiting a local review before terms are final.", updated: "Updated Sep 7" },
  { id: "Q-2458", title: "Summer camp starter", status: "Expired", detail: "The quote window has closed. Request a fresh demo quote.", updated: "Expired Aug 31" },
];

export const dealerOrders: DealerActionRecord[] = [
  { id: "B2B-1048", title: "Northshore Rec Center", status: "Processing", detail: "12 lines are prepared for fulfillment handoff.", updated: "Placed Sep 7" },
  { id: "B2B-1042", title: "Evergreen School District", status: "Shipped", detail: "Carrier confirmation becomes available with the live order service.", updated: "Shipped Sep 5" },
  { id: "B2B-1037", title: "Riverside Play Lab", status: "Delivered", detail: "Delivered order is available for a local reorder action.", updated: "Delivered Aug 28" },
];

export const dealerTeam = [
  { name: "Morgan Hayes", role: "Account owner", email: "morgan@northline.example" },
  { name: "Avery Chen", role: "Purchasing", email: "avery@northline.example" },
];

export const dealerAddresses = [
  { label: "Primary delivery", lines: ["1128 Alder Way", "Portland, OR 97205", "United States"] },
  { label: "Billing", lines: ["P.O. Box 416", "Portland, OR 97208", "United States"] },
];

export const dealerDownloads = [
  { title: "Dealer catalogue", detail: "PDF · Autumn 2026", access: "Permitted" },
  { title: "Product image pack", detail: "ZIP · Approved retail imagery", access: "Permitted" },
  { title: "Wholesale price list", detail: "XLSX · Live approval required", access: "Unavailable" },
  { title: "Brand campaign toolkit", detail: "ZIP · Market authorization required", access: "Unavailable" },
];
