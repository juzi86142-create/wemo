import type { FrontendModuleManifest } from "../module-manifest";

export const adminModule = {
  name: "admin",
  routeScope: "/admin",
  purpose: "平台运营管理后台",
} satisfies FrontendModuleManifest;

export * from "./admin-editor";
export * from "./admin-fixtures";
export * from "./admin-table";
export * from "./admin-workspace";
