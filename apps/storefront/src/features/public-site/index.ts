import type { FrontendModuleManifest } from "../module-manifest";

export const publicSiteModule = {
  name: "public-site",
  routeScope: "/",
  purpose: "公开品牌官网、产品、内容、经销商查找、支持和搜索",
} satisfies FrontendModuleManifest;
