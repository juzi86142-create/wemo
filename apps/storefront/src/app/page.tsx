import Link from "next/link";

const categories = [
  { name: "Bowling", marker: "01", tone: "coral" },
  { name: "Balance", marker: "02", tone: "blue" },
  { name: "Outdoor play", marker: "03", tone: "lime" },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="WEMOVE SPORTS home">
          WEMOVE<span>SPORTS</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/products">Products</Link>
          <Link href="/play">Play & Learn</Link>
          <Link href="/dealers">Dealers</Link>
          <Link href="/support">Support</Link>
        </nav>
        <Link className="header-action" href="/search">
          Search
        </Link>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">MOVE · PLAY · TOGETHER</p>
          <h1 id="hero-title">Play that gets everyone moving.</h1>
          <p className="hero-intro">
            Thoughtful sports games for active kids, shared family moments,
            and a little more movement in every day.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/products">
              Explore products
            </Link>
            <Link className="text-link" href="/play">
              Find a game idea <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="play-field" aria-hidden="true">
          <div className="track-line track-line-one" />
          <div className="track-line track-line-two" />
          <div className="ball ball-one" />
          <div className="ball ball-two" />
          <p>READY<br />SET<br />MOVE</p>
        </div>
      </section>

      <section className="category-section" aria-labelledby="category-title">
        <div className="section-heading">
          <p className="eyebrow">CHOOSE YOUR MOTION</p>
          <h2 id="category-title">Built for the way families play.</h2>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              className={`category-card ${category.tone}`}
              href={`/products/${category.name.toLowerCase().replace(" ", "-")}`}
              key={category.name}
            >
              <span>{category.marker}</span>
              <h3>{category.name}</h3>
              <p>See the collection</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="foundation-note">
        <p className="eyebrow">FOUNDATION PREVIEW</p>
        <p>
          This runnable shell establishes the visual and technical baseline.
          Product photography and final copy will be supplied and approved by
          the brand before launch.
        </p>
      </section>
    </main>
  );
}
