import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Star, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { apiGet, ApiError } from '@/lib/api-client';
import { SITE_URL } from '@/lib/site';
import { ProductGrid } from '@/components/shop/product-grid';
import { AddToCart } from '@/components/shop/add-to-cart';
import { WishlistButton } from '@/components/shop/wishlist-button';
import { CompareButton } from '@/components/shop/compare-button';
import { ProductReviews } from '@/components/shop/product-reviews';
import { VideoEmbed } from '@/components/shop/video-embed';
import { PremiumProductPage } from '@/components/shop/premium-product-page';
import { formatPrice } from '@/lib/utils';
import { getSettings, resolveContent } from '@/lib/settings';
import type { ProductSummary } from '@drikon/shared-types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ProductDetail extends ProductSummary {
  description: string;
  descriptionBn?: string | null;
  sku: string;
  attributes?: Record<string, unknown> | null;
  brandId?: string | null;
  categoryId: string;
  videoUrl?: string | null;
}

interface ProductListResponse {
  items: ProductSummary[];
  pagination: { total: number };
}

// cache() dedupes the fetch shared by generateMetadata + the page render.
const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  try {
    return await apiGet<ProductDetail>(`/api/v1/products/slug/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found' };
  const desc =
    product.shortDescription ||
    (product.description ? product.description.replace(/\s+/g, ' ').slice(0, 160) : `${product.name} — available now.`);
  const url = `${SITE_URL}/products/${product.slug}`;
  const img = product.images?.[0]?.url;
  return {
    title: product.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description: desc,
      url,
      type: 'website',
      ...(img ? { images: [{ url: img }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: desc,
      ...(img ? { images: [img] } : {}),
    },
  };
}

async function getRelated(categorySlug: string, excludeId: string): Promise<ProductSummary[]> {
  try {
    const data = await apiGet<ProductListResponse>(`/api/v1/products?category=${categorySlug}&limit=8`);
    return data.items.filter((p) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

async function getFrequentlyBoughtTogether(productId: string): Promise<ProductSummary[]> {
  try {
    return await apiGet<ProductSummary[]>(`/api/v1/recommendations/product/${productId}`);
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const t = await getTranslations('pdp');

  const frequentlyBoughtTogether = await getFrequentlyBoughtTogether(product.id);
  const related =
    frequentlyBoughtTogether.length > 0
      ? frequentlyBoughtTogether
      : await getRelated(product.category.slug, product.id);

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  const onSale = compareAt && compareAt > price;
  const discount = onSale && compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const content = resolveContent(await getSettings());

  const isPremium = product.attributes && typeof product.attributes === 'object' && 'template' in product.attributes && product.attributes.template === 'premium';

  // Product structured data (rich results in search).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    ...(product.images?.length ? { image: product.images.map((i) => i.url) } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: product.currency,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.slug}`,
    },
    ...(product.averageRating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.averageRating, reviewCount: product.reviewCount } }
      : {}),
  };
  const JsonLd = () => (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );

  if (isPremium) {
    return (
      <>
        <JsonLd />
        <PremiumProductPage product={product} related={related} />
      </>
    );
  }

  return (
    <>
    <JsonLd />
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-[color:var(--fg-muted)] mb-8 flex items-center gap-1.5 flex-wrap">
        <Link href="/products" className="hover:text-[color:var(--fg)] inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> {t('shop')}
        </Link>
        <span>/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-[color:var(--fg)]">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-[color:var(--fg)]">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 mb-16">
        {/* Left: image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-[color:var(--bg-soft)] border border-[color:var(--border)]">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt ?? product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-drikon-mesh" />
          )}
          {onSale && (
            <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold rounded-md bg-[color:var(--accent)] text-white">
              {t('offBadge', { discount })}
            </span>
          )}
        </div>

        {/* Right: meta + buy */}
        <div className="flex flex-col">
          {product.brand && (
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
              {product.brand.name}
            </div>
          )}

          <h1 className="display text-3xl md:text-4xl mb-3">{product.name}</h1>

          {product.averageRating > 0 && (
            <div className="flex items-center gap-1.5 mb-5 text-sm">
              <Star className="w-4 h-4 fill-[color:var(--accent-2)] text-[color:var(--accent-2)]" />
              <span className="font-medium">{product.averageRating.toFixed(1)}</span>
              <span className="text-[color:var(--fg-muted)]">{t('reviewsCount', { count: product.reviewCount })}</span>
            </div>
          )}

          {product.shortDescription && (
            <p className="text-[color:var(--fg-muted)] mb-6">{product.shortDescription}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="display text-3xl">{formatPrice(price, product.currency)}</span>
            {onSale && compareAt && (
              <span className="text-[color:var(--fg-muted)] line-through text-lg">
                {formatPrice(compareAt, product.currency)}
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6 text-sm">
            {product.stock === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/30">
                {t('outOfStock')}
              </span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                {t('onlyLeftInStock', { stock: product.stock })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/30">
                {t('inStock')}
              </span>
            )}
          </div>

          {/* Add to cart */}
          <div className="mb-8 flex items-stretch gap-3">
            <div className="flex-1">
              <AddToCart
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  image: product.images?.[0]?.url,
                  price,
                  currency: product.currency,
                  stock: product.stock,
                }}
              />
            </div>
            <WishlistButton
              productId={product.id}
              productName={product.name}
              variant="inline"
              className="self-start"
            />
            <CompareButton product={product} variant="inline" className="self-start" />
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-3 text-xs text-[color:var(--fg-muted)] border-t border-[color:var(--border)] pt-6">
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.shippingNote}</span>
            </div>
            <div className="flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.returnsNote}</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[color:var(--accent)] shrink-0 mt-0.5" />
              <span>{content.warrantyNote}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="mb-16">
        <h2 className="display text-2xl mb-4">{t('description')}</h2>
        <p className="text-[color:var(--fg-muted)] leading-relaxed max-w-3xl whitespace-pre-wrap">
          {product.description}
        </p>
      </section>

      {/* Video (if any) */}
      {product.videoUrl && (
        <section className="mb-16">
          <h2 className="display text-2xl mb-4">{t('watchItInAction')}</h2>
          <div className="max-w-3xl">
            <VideoEmbed url={product.videoUrl} />
          </div>
        </section>
      )}

      {/* Attributes (if any) */}
      {product.attributes && Object.keys(product.attributes).length > 0 && (
        <section className="mb-16">
          <h2 className="display text-2xl mb-4">{t('specifications')}</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl text-sm">
            {Object.entries(product.attributes).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-[color:var(--border)] py-2">
                <dt className="capitalize text-[color:var(--fg-muted)]">{key}</dt>
                <dd className="text-right font-medium">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Reviews */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* Related */}
      {related.length > 0 && (
        <section>
          <h2 className="display text-2xl mb-6">
            {frequentlyBoughtTogether.length > 0 ? t('frequentlyBoughtTogether') : t('youMightAlsoLike')}
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
    </>
  );
}
