"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ActionFeedback } from "../platform";
import { dealerCompany, dealerNav } from "./dealer-fixtures";

interface DealerWorkspaceProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function DealerWorkspace({ title, description, children }: DealerWorkspaceProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return <div className="dealer-frame">
    <aside className="dealer-rail">
      <Link className="brand" href="/dealer">WEMOVE</Link>
      <p className="dealer-demo-label">Demo workspace</p>
      <div className="dealer-company"><strong>{dealerCompany.name}</strong><span>{dealerCompany.status}</span></div>
      <nav className="dealer-nav" aria-label="Dealer navigation">
        {dealerNav.map((item) => <Link className={pathname === item.href ? "is-active" : undefined} href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <p className="dealer-rail-note">Local account context only. Live catalog access and terms remain server-owned.</p>
      <Link className="arrow-link" href="/">View storefront <span>↗</span></Link>
    </aside>
    <div className="dealer-content">
      <header className="dealer-topbar">
        <button className="dealer-menu-button" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>Menu</button>
        <Link className="brand dealer-mobile-brand" href="/dealer">WEMOVE</Link>
        <span className="dealer-mobile-demo-label">Demo workspace</span>
        <span className="dealer-mobile-status">{dealerCompany.status}</span>
      </header>
      {menuOpen ? <nav className="dealer-mobile-nav" aria-label="Dealer navigation">
        {dealerNav.map((item) => <Link className={pathname === item.href ? "is-active" : undefined} href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
      </nav> : null}
      <main className="dealer-main">
        <header className="dealer-heading"><p className="eyebrow">{dealerCompany.name.toUpperCase()} / LOCAL DEMO</p><h1>{title}</h1><p>{description}</p></header>
        {children}
        <ActionFeedback status="idle" idleMessage="Demo workspace: actions stay in this browser." />
      </main>
    </div>
  </div>;
}
