"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clearSessionToken } from "./api-client";
import { CartCount } from "../commerce/cart-count";
import { NewsletterForm } from "../public-site/newsletter-form";

const links = [
  ["Products", "/products"],
  ["Play & Learn", "/support"],
  ["Stories", "/content"],
  ["Dealers", "/dealers"],
  ["Support", "/support"],
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  function logout() {
    clearSessionToken();
    setMenuOpen(false);
    router.push("/login");
  }

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
          <button className="header-logout" type="button" onClick={logout}>Sign out</button>
          <Link href="/cart" className="cart-link" aria-label="Shopping cart">Cart <CartCount /></Link>
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
          <button className="mobile-logout" type="button" onClick={logout}>Sign out</button>
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
          <h4>Stories</h4>
          <nav className="footer-links" aria-label="Content links">
            <Link href="/content">Play notes</Link>
            <Link href="/content?category=Product%20care">Product care</Link>
            <Link href="/content?category=Field%20notes">Field notes</Link>
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
          <NewsletterForm />
        </div>
        <small>© 2026 WEMOVE SPORTS Co. All rights reserved. <span>Crafted for indoor &amp; outdoor longevity.</span></small>
      </footer>
    </div>
  );
}
