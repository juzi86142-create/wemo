"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["Products", "/products"],
  ["Play & learn", "/support"],
  ["Dealers", "/dealers"],
  ["Support", "/support"],
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-frame">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="WEMOVE SPORTS home">
          WEMOVE<span>SPORTS</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link href={href} key={href + label}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link href="/search" className="header-link">Search</Link>
          <Link href="/cart" className="cart-link" aria-label="Shopping cart">Cart <span>0</span></Link>
          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden="true">{menuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </header>
      {menuOpen ? (
        <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">
          {links.map(([label, href]) => <Link href={href} key={href + label} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          <Link href="/login" onClick={() => setMenuOpen(false)}>Account</Link>
        </nav>
      ) : null}
      {children}
      <footer className="site-footer">
        <div>
          <Link className="brand" href="/">WEMOVE<span>SPORTS</span></Link>
          <p>Move, play, together.</p>
        </div>
        <div className="footer-links">
          <Link href="/products">Products</Link>
          <Link href="/support">Support</Link>
          <Link href="/login">Account</Link>
          <Link href="/dealers">Dealers</Link>
        </div>
        <small>© 2026 WEMOVE SPORTS</small>
      </footer>
    </div>
  );
}
