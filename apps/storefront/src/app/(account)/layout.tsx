import type { ReactNode } from "react";

import { AccountShell, getSession } from "../../features/account";
import { SiteShell } from "../../features/platform";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return <SiteShell><AccountShell session={session}>{children}</AccountShell></SiteShell>;
}
