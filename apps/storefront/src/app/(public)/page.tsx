import Link from "next/link";

import { getPublicProducts, ProductCard } from "../../features/public-site";

const categories = [
  { number: "01", title: "Bowling & target", copy: "Coordination in motion", tone: "category-signal", query: "aim", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsQz7OcR1rSM_QLhFIWg8-0VZgL3GkxnwdzOG630PVtUWCOc70EffI81wB-x-ZapvKhn0RcFYOizTcGcnE_Rvs-xnYH2-0U2Xn8WOlVXw0Q2w3qTyaV-RMHUgWZXSj30eYNOmafcjijCNbvh9L2Ug7EXKY2QsDf6NNLPU0XKeLjg8bJVP5pAszIcCnxXcQJZen3gt0B4FzNaqavUb_dSyebXp-LOOUEG3k-wvdazDDJSHq7pqM_lEh" },
  { number: "02", title: "Balance & agility", copy: "Confidence, one step at a time", tone: "category-blue", query: "balance", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIO2vD8wsMMUNrc5hxXhYO7mgsqxZEyTb3V5quqDV1_YWpy6P6eVsp54blc86oSezj0UJx_MYqRJNCoD5jvyf8d0erMyhNHrJ_wun7zrhEPqPczLaJooh4Yy2ztrXIMm3GaKsgt5QyeiuatNTEpt5R0aLvGvLS2iBtmKtCOjIxr-OpCmbvw1kEa8anJZRaj8DydqVdY-F1vQsndZm-jFOysMHprXCK_f88w527jcKWmTrg3YwGPJE8" },
  { number: "03", title: "Outdoor play", copy: "More reasons to move", tone: "category-lime", query: "outdoor", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwbB8nz8r1z8Jwzf6MfS1Hg-88cYVOK_rWn74IPLQsiVm-W8nisvFOniCtvl0RDbyiDoVHi0-M8XN4l0qBfAvdWen6M5nLfy1Flj1HwanRn3BydrpDmDwmC_-vmyKWnut4JN4zLV96w8nkpik-G2bguPU_X19BOjv8Bti1zAORiMvXWsloOVT4NAoFgvHus-6yH-O05QTDxWtK_Vsl-CG_SQnDUqB05cSWiaGYVqCZois1z-Zf_yUj" },
];

const heroImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuBz0iXd7n7vD6Bqov-VrmIC_K9d0IQ8F--_7l_Egop_NLlsaYSSOA_LhoGtv2QuCdGeeVF_TQd9scgHd78LxtVOOd6WyoNpGLt8tIE3pseHn5vSQlxJYVW5dQpWijyE4sr_BKAiqBPJj3vpgl8LUAQ_hLk8F9BUl62CqAGx2Tv7iarMk11x-gjZc8w958EQox2FLRcUN2SF1co4QKkDdtKpuuWhonvLlxTbDUGrK-LG6mkmeLuNZugJ";

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
        <div className="hero-art" aria-label="Family movement in the garden">
          <img className="hero-photo" src={heroImage} alt="Family movement in a sunlit garden." />
          <div className="hero-overlay" aria-hidden="true" />
          <p className="hero-stamp">MOVE<br />TOGETHER</p>
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
          {categories.map((category) => <Link className={"category-card " + category.tone} href={"/products?q=" + category.query} key={category.number}><img src={category.image} alt="" /><span>{category.number}</span><div className="category-card-content"><h3>{category.title}</h3><p>{category.copy} <span aria-hidden="true">↗</span></p></div></Link>)}
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
      <section className="home-benefits" aria-labelledby="benefits-title">
        <div className="section-heading"><p className="eyebrow">BUILT FOR EVERYDAY MOVEMENT</p><h2 id="benefits-title">Play with purpose.</h2></div>
        <div className="benefit-grid">
          <article><strong>01</strong><h3>Move naturally</h3><p>Open-ended play that invites balance, coordination, and confidence.</p></article>
          <article><strong>02</strong><h3>Play together</h3><p>Shared games made for families, friends, and all kinds of abilities.</p></article>
          <article><strong>03</strong><h3>Made to last</h3><p>Thoughtful materials and simple forms that belong in real homes.</p></article>
          <article><strong>04</strong><h3>Keep discovering</h3><p>Ideas, guides, and new ways to move through every season.</p></article>
        </div>
      </section>
      <section className="home-dealer-panel" aria-labelledby="dealer-panel-title">
        <div><p className="eyebrow">BRING WEMOVE TO MORE FAMILIES</p><h2 id="dealer-panel-title">A better way to play, wherever you are.</h2><p>Find an authorised dealer for a closer look at our collection and thoughtful guidance.</p></div>
        <Link className="button button-dark" href="/support">Talk to our team <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
