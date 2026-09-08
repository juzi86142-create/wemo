export interface AdminNavItem {
  href: "/admin" | "/admin/products" | "/admin/orders" | "/admin/dealers" | "/admin/content" | "/admin/settings";
  label: string;
  eyebrow: string;
  description: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "coral" | "lime" | "ink";
}

export type AdminStatus = "Active" | "Draft" | "Pending" | "Review" | "Paid" | "Fulfillment" | "Published" | "Attention";

export interface AdminRecord {
  id: string;
  title: string;
  meta: string;
  status: AdminStatus;
  updated: string;
  detail: string;
}

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Overview", eyebrow: "OVERVIEW", description: "Operations at a glance." },
  { href: "/admin/products", label: "Products", eyebrow: "PRODUCTS", description: "Catalogues, availability, and product details." },
  { href: "/admin/orders", label: "Orders", eyebrow: "ORDERS", description: "Recent orders and fulfillment handoff." },
  { href: "/admin/dealers", label: "Dealers", eyebrow: "DEALERS", description: "Partner applications and approval queue." },
  { href: "/admin/content", label: "Content", eyebrow: "CONTENT", description: "Pages and publishing status." },
  { href: "/admin/settings", label: "SETTINGS", eyebrow: "SETTINGS", description: "Profile, roles, markets, and audit preferences." },
];

export const adminMetrics: AdminMetric[] = [
  { label: "Orders today", value: "38", detail: "6 need fulfillment", tone: "blue" },
  { label: "Net sales", value: "$4,820", detail: "Demo reporting view", tone: "ink" },
  { label: "Dealer reviews", value: "12", detail: "4 new applications", tone: "coral" },
  { label: "Content checks", value: "3", detail: "Drafts need review", tone: "lime" },
];

export const adminRecords: Record<"products" | "orders" | "dealers" | "content", AdminRecord[]> = {
  products: [
    { id: "WM-201", title: "Roll & Play Bowling Set", meta: "Active play · 24 units", status: "Active", updated: "Updated today", detail: "Retail product with core media, category, and availability controls." },
    { id: "WM-118", title: "Balance Trail Kit", meta: "Outdoor play · 8 units", status: "Attention", updated: "Updated yesterday", detail: "Inventory needs an operations review before the next dealer allocation." },
    { id: "WM-312", title: "Team Toss Markers", meta: "Team play · 72 units", status: "Draft", updated: "Updated Sep 6", detail: "New collection entry waiting for a title, copy, and publication decision." },
  ],
  orders: [
    { id: "#WM-1048", title: "Maya Porter", meta: "3 items · $184.00", status: "Paid", updated: "Placed 28 min ago", detail: "Payment is recorded in this demo view; hand off fulfillment only after live order data is connected." },
    { id: "#WM-1047", title: "Field Day Co.", meta: "12 items · $1,260.00", status: "Fulfillment", updated: "Placed 2 hr ago", detail: "Dealer order prepared for fulfillment review and delivery confirmation." },
    { id: "#WM-1045", title: "Evan Reed", meta: "1 item · $68.00", status: "Pending", updated: "Placed yesterday", detail: "The order is waiting for a payment or stock update from the live service." },
  ],
  dealers: [
    { id: "DLR-090", title: "Little Motion Supply", meta: "Seattle, United States", status: "Review", updated: "Applied today", detail: "Application includes a regional storefront and active-play product focus." },
    { id: "DLR-088", title: "Playful Goods GmbH", meta: "Hamburg, Germany", status: "Pending", updated: "Applied Sep 7", detail: "Awaiting a team member's commercial terms review." },
    { id: "DLR-081", title: "Go Outside Co.", meta: "Toronto, Canada", status: "Active", updated: "Reviewed Sep 5", detail: "Approved partner shown here as local demo data only." },
  ],
  content: [
    { id: "CNT-042", title: "How we make movement matter", meta: "Journal · 840 words", status: "Published", updated: "Published Sep 4", detail: "Editorial story visible in the demo content list." },
    { id: "CNT-043", title: "Autumn field day guide", meta: "Guide · 1,120 words", status: "Draft", updated: "Edited Sep 7", detail: "Draft guide waiting for title, hero image, and final review." },
    { id: "CNT-040", title: "Dealer application FAQ", meta: "Support · 14 answers", status: "Review", updated: "Edited Sep 6", detail: "Support copy is ready for editorial approval." },
  ],
};

export const adminAlerts = [
  { title: "Inventory needs attention", detail: "Balance Trail Kit has 8 units available.", href: "/admin/products" },
  { title: "Four dealer applications are new", detail: "Review business details before sending terms.", href: "/admin/dealers" },
  { title: "Three content drafts need a decision", detail: "Assign an owner or schedule publication.", href: "/admin/content" },
];
