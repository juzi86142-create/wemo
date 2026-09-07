"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["Products", "/products"],
  ["Play & Learn", "/support"],
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
          <Link href="/login" className="header-link">Account</Link>
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
          <p>Designing kinetic simplicity and architectural active-play instruments for modern families.</p>
        </div>
        <div>
          <h4>Products</h4>
          <nav className="footer-links" aria-label="Product links">
            <Link href="/products">All products</Link>
            <Link href="/products?q=bowling">Bowling &amp; target</Link>
            <Link href="/products?q=balance">Balance &amp; coordination</Link>
          </nav>
        </div>
        <div>
          <h4>Play &amp; Learn</h4>
          <nav className="footer-links" aria-label="Play and learn links">
            <Link href="/support">Support hub</Link>
            <Link href="/support#faq">FAQs</Link>
            <Link href="/support#contact">Contact</Link>
          </nav>
        </div>
        <div>
          <h4>Company</h4>
          <nav className="footer-links" aria-label="Company links">
            <Link href="/dealers">Dealers</Link>
            <Link href="/login">Account</Link>
            <Link href="/support">About WEMOVE</Link>
          </nav>
        </div>
        <div className="footer-signup">
          <h4>More ways to move.</h4>
          <p>Quiet dispatches on active family movement, architectural play spaces, and new releases.</p>
          <div className="footer-signup-row">
            <label className="sr-only" htmlFor="footer-email">Email address</label>
            <input id="footer-email" type="email" placeholder="Enter email address" />
            <button type="button">Join</button>
          </div>
        </div>
        <small>© 2026 WEMOVE SPORTS Co. All rights reserved. <span>Crafted for indoor &amp; outdoor longevity.</span></small>
      </footer>
    </div>
  );
}
