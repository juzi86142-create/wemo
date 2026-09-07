import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionActor } from "@wemo/contracts";

export function AccountShell({ session, children }: { session: SessionActor | null; children: ReactNode }) {
  return (
    <div className="account-frame">
      <aside className="account-sidebar">
        <p className="eyebrow">YOUR SPACE</p>
        <h2>Account</h2>
        {session ? <nav className="account-nav" aria-label="Account navigation"><Link href="/account">Overview</Link><Link href="/account/profile">Profile</Link><Link href="/account/addresses">Addresses</Link><Link href="/account/orders">Orders</Link></nav> : <p className="account-sidebar-note">Sign in to keep your details, addresses, and orders close.</p>}
        <Link className="arrow-link" href="/products">Back to products <span aria-hidden="true">↗</span></Link>
      </aside>
      <div className="account-content">{children}</div>
    </div>
  );
}
