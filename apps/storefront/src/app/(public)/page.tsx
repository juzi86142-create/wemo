import Link from "next/link";

import { getPublicProducts, ProductCard } from "../../features/public-site";

const categories = [
  { number: "01", title: "Roll & aim", copy: "Coordination in motion", tone: "category-signal", query: "aim" },
  { number: "02", title: "Find balance", copy: "Confidence, one step at a time", tone: "category-blue", query: "balance" },
  { number: "03", title: "Play outside", copy: "More reasons to move", tone: "category-lime", query: "outdoor" },
];

export default async function HomePage() {
  const featured = await getPublicProducts({ page: 1, page_size: 3, sort: "featured" });

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">MOVE · PLAY · TOGETHER</p>
          <h1 id="hero-title">Play that gets everyone moving.</h1>
          <p className="hero-intro">Thoughtful sports games for active kids, shared family moments, and a little more movement in every day.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/products">Explore products <span aria-hidden="true">↗</span></Link>
            <Link className="arrow-link" href="/support">Find a game idea <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="hero-art" aria-label="Graphic composition of a colourful play field">
          <div className="hero-ring hero-ring-one" />
          <div className="hero-ring hero-ring-two" />
          <div className="hero-ball hero-ball-lime" />
          <div className="hero-ball hero-ball-blue" />
          <p className="hero-stamp">READY<br />SET<br />MOVE</p>
          <span className="hero-caption">WEMOVE / 2026</span>
        </div>
      </section>
      <section className="intro-band" aria-labelledby="intro-title">
        <p className="eyebrow">THE WEMOVE WAY</p>
        <div><h2 id="intro-title">Everyday movement, made easier to start.</h2><p>Our games turn coordination, balance, and a little friendly competition into something everyone can join.</p></div>
      </section>
      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading"><p className="eyebrow">CHOOSE YOUR MOTION</p><h2 id="category-title">Built for the way families play.</h2></div>
        <div className="category-grid">
          {categories.map((category) => <Link className={"category-card " + category.tone} href={"/products?q=" + category.query} key={category.number}><span>{category.number}</span><h3>{category.title}</h3><p>{category.copy} <span aria-hidden="true">↗</span></p></Link>)}
        </div>
      </section>
      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading section-heading-with-action"><div><p className="eyebrow">GOOD TO GO</p><h2 id="featured-title">A small collection with a lot to do.</h2></div><Link className="arrow-link" href="/products">See all products <span aria-hidden="true">↗</span></Link></div>
        <div className="product-grid compact-grid">{featured.items.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        {featured.preview ? <p className="preview-note">Preview catalogue shown while the content service is not connected.</p> : null}
      </section>
      <section className="support-strip" aria-labelledby="support-title">
        <div className="support-strip-number">04</div><div><p className="eyebrow">NEED A HAND?</p><h2 id="support-title">Find a way to play that fits your day.</h2></div><Link className="button button-light" href="/support">Visit support <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
