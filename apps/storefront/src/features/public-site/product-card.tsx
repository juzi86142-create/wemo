import Link from "next/link";
import type { CatalogProduct } from "@wemo/contracts";

import { formatAgeRange, getProductImageAlt } from "./catalog-adapter";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const artClass = "product-art product-art-" + ((product.id % 3) + 1);

  return (
    <article className="product-card">
      <Link className={artClass} href={"/products/" + product.slug} aria-label={"View " + product.name}>
        {product.primary_image_url ? (
          <img src={product.primary_image_url} alt={getProductImageAlt(product)} />
        ) : (
          <span className="product-mark" aria-hidden="true">W</span>
        )}
        <span className="product-index">0{product.id % 10}</span>
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{formatAgeRange(product.age_min, product.age_max)}</span>
          <span>{product.tags[0] ?? "Move"}</span>
        </div>
        <h2><Link href={"/products/" + product.slug}>{product.name}</Link></h2>
        <p>{product.short_description}</p>
        <Link className="arrow-link" href={"/products/" + product.slug}>View product <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}

