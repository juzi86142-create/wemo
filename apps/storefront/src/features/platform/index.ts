import type { FrontendModuleManifest } from "../module-manifest";

export const platformModule = {
  name: "platform",
  routeScope: "all routes",
  purpose: "应用壳、国际化、SEO、同意、分析、权限与质量能力",
} satisfies FrontendModuleManifest;

export * from "./analytics";
export * from "./action-feedback";
export * from "./api-client";
export * from "./demo-storage";
export * from "./pagination";
export * from "./pagination-control";
export * from "./site-shell";
export * from "./status-panel";
