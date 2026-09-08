import type { ReactNode } from "react";

import { AccountShell } from "../../features/account";
import { SiteShell } from "../../features/platform";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <SiteShell><AccountShell>{children}</AccountShell></SiteShell>;
}
