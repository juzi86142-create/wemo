"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ActionFeedback } from "../platform/action-feedback";
import { StatusPanel } from "../platform/status-panel";
import { demoAccountHomePath } from "../account/demo-accounts";
import { useDemoSession } from "../account/use-demo-session";
import { adminNav } from "./admin-fixtures";

interface AdminWorkspaceProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminWorkspace({ title, description, children }: AdminWorkspaceProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { account, ready } = useDemoSession();

  if (!ready) {
    return <main className="auth-page"><StatusPanel kind="loading" title="Opening the admin demo..." description="Checking the account saved in this browser." /></main>;
  }
  if (account?.audience !== "staff") {
    const description = account
      ? `This demo is signed in as ${account.roleLabel}. Open the matching workspace or switch accounts.`
      : "Choose the administrator demo account to view the admin workspace.";
    const action = account
      ? <Link className="button button-dark" href={demoAccountHomePath(account.audience)}>Open {account.roleLabel}</Link>
      : <Link className="button button-dark" href="/login">Sign in</Link>;
    return <main className="auth-page"><StatusPanel kind="forbidden" title="Administrator account required." description={description} action={action} /></main>;
  }

  return (
    <div className="admin-frame">
      <aside className="admin-rail">
        <Link className="brand" href="/admin">WEMOVE</Link>
        <p className="admin-demo-label">Demo workspace</p>
        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNav.map((item) => <Link className={pathname === item.href ? "is-active" : undefined} href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
        <p className="admin-rail-note">Local fixtures only. Live permissions and operations remain server-owned.</p>
        <Link className="arrow-link" href="/login">Switch demo account <span>↗</span></Link>
        <Link className="arrow-link" href="/">View storefront <span>↗</span></Link>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <button className="admin-menu-button" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>Menu</button>
          <Link className="brand admin-mobile-brand" href="/admin">WEMOVE</Link>
          <ActionFeedback status="idle" idleMessage="Demo workspace" />
        </header>
        {menuOpen ? <nav className="admin-mobile-nav" aria-label="Admin navigation">
          {adminNav.map((item) => <Link className={pathname === item.href ? "is-active" : undefined} href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
        </nav> : null}
        <main className="admin-main">
          <header className="admin-heading">
            <p className="eyebrow">ADMIN / {account.name.toUpperCase()} / LOCAL DEMO</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
