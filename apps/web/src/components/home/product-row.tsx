import type { ProductSummary } from '@drikon/shared-types';
import { ProductCarousel } from '@/components/shop/product-carousel';
import { SectionHeader } from './section-header';

/** A titled homepage row of product cards. Renders nothing when there are no products. */
export function ProductRow({
  id,
  title,
  href,
  linkLabel,
  products,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  products: ProductSummary[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="shell py-8" aria-labelledby={id}>
      <SectionHeader id={id} title={title} href={href} linkLabel={linkLabel} />
      <ProductCarousel products={products} label={title} />
    </section>
  );
}
