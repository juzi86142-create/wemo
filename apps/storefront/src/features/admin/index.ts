import type { FrontendModuleManifest } from "../module-manifest";

export const adminModule = {
  name: "admin",
  routeScope: "/admin",
  purpose: "平台运营管理后台",
} satisfies FrontendModuleManifest;
