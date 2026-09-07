import type { CatalogProduct } from "@wemo/contracts";

import { getProductImageAlt } from "./catalog-adapter";

export function ProductGallery({ product }: { product: CatalogProduct }) {
  return (
    <div className="product-gallery">
      <div className="product-gallery-main product-art product-art-2">
        {product.primary_image_url ? (
          <img src={product.primary_image_url} alt={getProductImageAlt(product)} />
        ) : (
          <>
            <span className="product-mark" aria-hidden="true">W</span>
            <span className="gallery-note">Movement, made visible.</span>
          </>
        )}
      </div>
      <div className="product-gallery-strip" aria-label="Product media">
        <span className="gallery-thumb thumb-signal" aria-hidden="true" />
        <span className="gallery-thumb thumb-blue" aria-hidden="true" />
        <span className="gallery-thumb thumb-lime" aria-hidden="true" />
      </div>
    </div>
  );
}
