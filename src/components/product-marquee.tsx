import { ProductView } from "@/lib/catalog-types";
import { ProductCard } from "@/components/product-card";

export function ProductMarquee({ products }: { products: ProductView[] }) {
  if (!products.length) return null;

  const visibleProducts = products.slice(0, 10);
  const marqueeProducts = visibleProducts.length >= 4 ? visibleProducts : [...visibleProducts, ...visibleProducts, ...visibleProducts].slice(0, 6);

  return (
    <div className="product-marquee" aria-label="ყველაზე მოთხოვნადი პროდუქტები">
      <div className="product-marquee-track">
        <ProductSet products={marqueeProducts} />
        <ProductSet products={marqueeProducts} hidden />
      </div>
    </div>
  );
}

function ProductSet({ products, hidden = false }: { products: ProductView[]; hidden?: boolean }) {
  return (
    <div className="product-marquee-set" aria-hidden={hidden || undefined}>
      {products.map((product, index) => (
        <div className="product-marquee-item" key={`${hidden ? "clone" : "main"}-${product.id}-${index}`}>
          <ProductCard product={product} imagePriority={!hidden && index < 3} />
        </div>
      ))}
    </div>
  );
}
