import type { FrontendModuleManifest } from "../module-manifest";

export const accountModule = {
  name: "account",
  routeScope: "/account, /cart, /checkout, /order/success",
  purpose: "注册用户中心与可选 B2C 交易体验",
} satisfies FrontendModuleManifest;
