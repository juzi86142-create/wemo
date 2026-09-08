"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { StatusPanel } from "../platform/status-panel";
import { demoAccountHomePath } from "./demo-accounts";
import { useDemoSession } from "./use-demo-session";

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { account, ready } = useDemoSession();
  const protectsAccountPage = pathname.startsWith("/account");
  const hasUserAccess = account?.audience === "user";

  let content = children;
  if (protectsAccountPage && !ready) {
    content = <StatusPanel kind="loading" title="Opening your demo account..." description="Checking the account saved in this browser." />;
  } else if (protectsAccountPage && !hasUserAccess) {
    const description = account
      ? `This demo is signed in as ${account.roleLabel}. Open the matching workspace or switch accounts.`
      : "Choose the customer demo account to view profile, addresses, and orders.";
    const action = account
      ? <Link className="button button-dark" href={demoAccountHomePath(account.audience)}>Open {account.roleLabel}</Link>
      : <Link className="button button-dark" href="/login">Sign in</Link>;
    content = <StatusPanel kind="forbidden" title="Customer account required." description={description} action={action} />;
  }

  return (
    <div className="account-frame">
      <aside className="account-sidebar">
        <p className="eyebrow">YOUR SPACE</p>
        <h2>Account</h2>
        {hasUserAccess ? <><p className="account-sidebar-note">Signed in as {account.name}</p><nav className="account-nav" aria-label="Account navigation"><Link href="/account">Overview</Link><Link href="/account/profile">Profile</Link><Link href="/account/addresses">Addresses</Link><Link href="/account/orders">Orders</Link></nav></> : <p className="account-sidebar-note">Sign in to keep your details, addresses, and orders close.</p>}
        <Link className="arrow-link" href="/products">Back to products <span aria-hidden="true">↗</span></Link>
      </aside>
      <div className="account-content">{content}</div>
    </div>
  );
}
