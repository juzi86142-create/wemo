"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ActionFeedback } from "../platform";
import { adminNav } from "./admin-fixtures";

interface AdminWorkspaceProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AdminWorkspace({ title, description, children }: AdminWorkspaceProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-frame">
      <aside className="admin-rail">
        <Link className="brand" href="/admin">WEMOVE</Link>
        <p className="admin-demo-label">Demo workspace</p>
        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNav.map((item) => <Link className={pathname === item.href ? "is-active" : undefined} href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
        <p className="admin-rail-note">Local fixtures only. Live permissions and operations remain server-owned.</p>
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
            <p className="eyebrow">ADMIN / LOCAL DEMO</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
