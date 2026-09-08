import type { FrontendModuleManifest } from "../module-manifest";

export const publicSiteModule = {
  name: "public-site",
  routeScope: "/",
  purpose: "公开品牌官网、产品、内容、经销商查找、支持和搜索",
} satisfies FrontendModuleManifest;

export * from "./catalog-adapter";
export * from "./contact-form";
export * from "./contact-validation";
export * from "./content-card";
export * from "./content-fixtures";
export * from "./filter-bar";
export * from "./newsletter-form";
export * from "./newsletter-validation";
export * from "./product-card";
export * from "./product-gallery";
