import type { Metadata } from "next";
import Link from "next/link";

import { getPreviewProducts, getPublicProduct, ProductCard, ProductGallery } from "../../../../features/public-site";
import { StatusPanel } from "../../../../features/platform";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicProduct(slug);
  return {
    title: result.product?.name ?? "Product",
    description: result.product?.short_description ?? "Sports games made for active, shared play.",
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const result = await getPublicProduct(slug);

  if (!result.product) {
    return <main className="page-main"><StatusPanel kind={result.error?.status === 403 ? "forbidden" : "error"} title="That product is not available." description="The product may have moved, or the catalogue is temporarily unavailable." requestId={result.error?.requestId} action={<Link className="button button-secondary" href="/products">Back to products</Link>} /></main>;
  }

  const product = result.product;
  const related = getPreviewProducts().filter((item) => item.id !== product.id).slice(0, 2);

  return (
    <main className="page-main">
      <div className="breadcrumbs"><Link href="/products">Products</Link><span aria-hidden="true">/</span><span>{product.name}</span></div>
      <section className="product-detail">
        <ProductGallery product={product} />
        <div className="product-detail-copy">
          <p className="eyebrow">{product.tags[0] ?? "MOVE"} / WEMOVE SPORTS</p>
          <h1>{product.name}</h1>
          <p className="product-lede">{product.description ?? product.short_description}</p>
          <div className="detail-rule" />
          <div className="detail-facts">
            <div><span>Best for</span><strong>{product.age_min === null && product.age_max === null ? "Everyone" : (product.age_min ?? "") + "–" + (product.age_max ?? "") + " years"}</strong></div>
            <div><span>Made for</span><strong>{product.tags.slice(0, 2).join(" + ") || "Shared play"}</strong></div>
          </div>
          <button className="button button-dark add-button" type="button">Add to cart <span aria-hidden="true">+</span></button>
          {result.preview ? <p className="preview-note">Preview product. Cart actions will connect to the API when enabled.</p> : null}
          <div className="detail-accordion">
            <details open><summary>Why families like it</summary><p>{product.short_description} Designed for repeat play, easy setup, and a little more movement.</p></details>
            <details><summary>What is included</summary><p>Product contents and specifications will be supplied by the live catalogue.</p></details>
          </div>
        </div>
      </section>
      <section className="related-section" aria-labelledby="related-title">
        <div className="section-heading"><p className="eyebrow">KEEP MOVING</p><h2 id="related-title">You might also like.</h2></div>
        <div className="product-grid compact-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
      </section>
    </main>
  );
}
