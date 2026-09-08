import type { FrontendModuleManifest } from "../module-manifest";

export const dealerModule = {
  name: "dealer",
  routeScope: "/dealer",
  purpose: "经销商企业门户与 B2B 采购流程",
} satisfies FrontendModuleManifest;

export * from "./dealer-adapter";
export * from "./dealer-application-form";
export * from "./dealer-action-panel";
export * from "./dealer-catalog";
export * from "./dealer-display";
export * from "./dealer-draft";
export * from "./dealer-fixtures";
export * from "./dealer-listing-card";
export * from "./dealer-quick-order";
export * from "./dealer-validation";
export * from "./dealer-workspace";
