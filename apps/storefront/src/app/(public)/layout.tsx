import type { ReactNode } from "react";

import { SiteShell } from "../../features/platform";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
