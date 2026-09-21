import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { apiGet, ApiError } from '@/lib/api-client';
import { SITE_URL } from '@/lib/site';
import { ProductCarousel } from '@/components/shop/product-carousel';
import { ProductGallery } from '@/components/shop/product-gallery';
import { StarRating } from '@/components/shop/star-rating';
import { SectionHeader } from '@/components/home/section-header';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddToCart } from '@/components/shop/add-to-cart';
import { WishlistButton } from '@/components/shop/wishlist-button';
import { CompareButton } from '@/components/shop/compare-button';
import { ProductReviews } from '@/components/shop/product-reviews';
import { VideoEmbed } from '@/components/shop/video-embed';
import { PremiumProductPage } from '@/components/shop/premium-product-page';
import { formatPrice, effectivePrice } from '@/lib/utils';
import { getSettings, resolveContent } from '@/lib/settings';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';
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
    return await apiGet<ProductDetail>(`/api/v1/products/slug/${slug}`, { revalidate: 60 });
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
    const data = await apiGet<ProductListResponse>(`/api/v1/products?category=${categorySlug}&limit=11`, { revalidate: 300 });
    return data.items.filter((p) => p.id !== excludeId).slice(0, 10);
  } catch {
    return [];
  }
}

async function getFrequentlyBoughtTogether(productId: string): Promise<ProductSummary[]> {
  try {
    return await apiGet<ProductSummary[]>(`/api/v1/recommendations/product/${productId}`, { revalidate: 300 });
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const t = await getTranslations('pdp');
  const tNav = await getTranslations('nav');
  const locale = (await getLocale()) as Locale;

  const frequentlyBoughtTogether = await getFrequentlyBoughtTogether(product.id);
  // Both rows, not either/or: association rules often yield only one or two
  // products, which alone left a single card in a wide row.
  const fbtIds = new Set(frequentlyBoughtTogether.map((p) => p.id));
  const related = (await getRelated(product.category.slug, product.id)).filter((p) => !fbtIds.has(p.id));

  // `price` is what checkout will charge: the live flash-sale price when one is
  // running, otherwise the catalogue price.
  const { price, listPrice, onSale: onFlashSale, discountPercent } = effectivePrice(product);
  const compareAt = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;
  const struckPrice = onFlashSale ? listPrice : compareAt && compareAt > price ? compareAt : null;
  const onSale = struckPrice !== null;
  const discount = onFlashSale
    ? discountPercent
    : struckPrice
      ? Math.round(((struckPrice - price) / struckPrice) * 100)
      : 0;

  const content = resolveContent(await getSettings());

  const name = localize(product.name, product.nameBn, locale);
  const description = localize(product.description, product.descriptionBn, locale);

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

  const specs = Object.entries(product.attributes ?? {}).filter(([key]) => key !== 'template');

  return (
    <>
      <JsonLd />
      <div className="shell py-6">
        <Breadcrumbs
          homeLabel={tNav('home')}
          items={[
            { label: t('shop'), href: '/products' },
            { label: localize(product.category.name, null, locale), href: `/products?category=${product.category.slug}` },
            { label: name },
          ]}
        />

        {/* ─── Gallery · details ─── */}
        <div className="mt-5 card !p-4 sm:!p-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <ProductGallery
            images={product.images ?? []}
            name={name}
            badge={
              <>
                {onSale && <span className="badge-sale !text-xs">{t('offBadge', { discount })}</span>}
                {onFlashSale && <span className="badge-deal !text-xs">{t('flashSale')}</span>}
              </>
            }
          />

          <div className="flex flex-col min-w-0">
            {product.brand && (
              <Link
                href={`/products?brand=${product.brand.slug}`}
                className="self-start text-xs font-bold uppercase tracking-wide text-[color:var(--accent)] hover:underline underline-offset-4 mb-1.5"
              >
                {product.brand.name}
              </Link>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">{name}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {product.reviewCount > 0 ? (
                <a href="#product-tabs" className="inline-flex items-center gap-2 hover:text-[color:var(--accent)]">
                  <StarRating value={product.averageRating} size={15} />
                  <span className="font-semibold">{product.averageRating.toFixed(1)}</span>
                  <span className="text-[color:var(--fg-muted)]">{t('reviewsCount', { count: product.reviewCount })}</span>
                </a>
              ) : (
                <span className="text-[color:var(--fg-muted)]">{t('noReviewsYet')}</span>
              )}
              <span className="text-[color:var(--fg-muted)]">
                {t('sku')}: <span className="font-mono text-[color:var(--fg)]">{product.sku}</span>
              </span>
            </div>

            {product.shortDescription && (
              <p className="mt-4 text-[color:var(--fg-muted)] leading-relaxed">
                {localize(product.shortDescription, product.shortDescriptionBn, locale)}
              </p>
            )}

            {/* ─── Buy box ─── */}
            <div className="mt-6 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--bg-soft)]/60 p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={`price-now text-3xl ${onSale ? 'is-sale' : ''}`}>{formatPrice(price, product.currency)}</span>
                {struckPrice !== null && <span className="price-was text-lg">{formatPrice(struckPrice, product.currency)}</span>}
                {onSale && (
                  <span className="text-sm font-bold text-[color:var(--color-sale)]">
                    {t('youSave', { amount: formatPrice((struckPrice ?? price) - price, product.currency) })}
                  </span>
                )}
              </div>

              <div className="mt-3 text-sm">
                {product.stock === 0 ? (
                  <StockLine tone="out">{t('outOfStock')}</StockLine>
                ) : product.stock <= 5 ? (
                  <StockLine tone="low">{t('onlyLeftInStock', { stock: product.stock })}</StockLine>
                ) : (
                  <StockLine tone="in">{t('inStock')}</StockLine>
                )}
              </div>

              <div className="mt-5">
                <AddToCart
                  showBuyNow
                  product={{
                    id: product.id,
                    name,
                    slug: product.slug,
                    image: product.images?.[0]?.url,
                    price,
                    currency: product.currency,
                    stock: product.stock,
                  }}
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <WishlistButton productId={product.id} productName={name} variant="inline" />
                <CompareButton product={product} variant="inline" />
              </div>
            </div>

            {/* ─── Trust signals (admin-editable) ─── */}
            <ul className="mt-5 grid sm:grid-cols-3 gap-3 text-[13px]">
              <TrustItem icon={<Truck className="w-5 h-5" />}>{content.shippingNote}</TrustItem>
              <TrustItem icon={<RefreshCw className="w-5 h-5" />}>{content.returnsNote}</TrustItem>
              <TrustItem icon={<ShieldCheck className="w-5 h-5" />}>{content.warrantyNote}</TrustItem>
            </ul>
          </div>
        </div>

        {/* ─── Description · specifications · reviews ─── */}
        <div id="product-tabs" className="mt-6 card !p-0 scroll-mt-40">
          <Tabs defaultValue="description">
            <TabsList className="px-2 sm:px-4">
              <TabsTrigger value="description">{t('description')}</TabsTrigger>
              {specs.length > 0 && <TabsTrigger value="specs">{t('specifications')}</TabsTrigger>}
              <TabsTrigger value="reviews">
                {t('reviews')} ({product.reviewCount})
              </TabsTrigger>
            </TabsList>

            <div className="px-5 sm:px-8 pb-8">
              <TabsContent value="description">
                <p className="text-[color:var(--fg)]/80 leading-relaxed max-w-3xl whitespace-pre-wrap">{description}</p>
                {product.videoUrl && (
                  <div className="mt-8 max-w-3xl">
                    <h2 className="text-lg font-extrabold mb-3">{t('watchItInAction')}</h2>
                    <VideoEmbed url={product.videoUrl} />
                  </div>
                )}
              </TabsContent>

              {specs.length > 0 && (
                <TabsContent value="specs">
                  <table className="table-clean max-w-3xl rounded-[var(--radius-ctl)] overflow-hidden border border-[color:var(--border)]">
                    <tbody>
                      {specs.map(([key, value]) => (
                        <tr key={key}>
                          <th scope="row" className="!normal-case !tracking-normal !text-sm !font-semibold w-1/3 capitalize">
                            {key}
                          </th>
                          <td>{Array.isArray(value) ? value.join(', ') : String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabsContent>
              )}

              <TabsContent value="reviews">
                <ProductReviews productId={product.id} productName={name} hideHeading />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* ─── Frequently bought together (Apriori) · same-category ─── */}
        {frequentlyBoughtTogether.length > 0 && (
          <section className="mt-10" aria-labelledby="bought-together">
            <SectionHeader id="bought-together" title={t('frequentlyBoughtTogether')} />
            <ProductCarousel products={frequentlyBoughtTogether} label={t('frequentlyBoughtTogether')} />
          </section>
        )}
        {related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-products">
            <SectionHeader
              id="related-products"
              title={t('youMightAlsoLike')}
              href={`/products?category=${product.category.slug}`}
              linkLabel={t('viewAll')}
            />
            <ProductCarousel products={related} label={t('youMightAlsoLike')} />
          </section>
        )}
      </div>
    </>
  );
}

function StockLine({ tone, children }: { tone: 'in' | 'low' | 'out'; children: React.ReactNode }) {
  const color =
    tone === 'in' ? 'var(--color-success)' : tone === 'low' ? '#b54708' : 'var(--color-sale)';
  return (
    <span className="inline-flex items-center gap-2 font-semibold" style={{ color }}>
      <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function TrustItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 rounded-[var(--radius-ctl)] border border-[color:var(--border)] px-3 py-2.5">
      <span aria-hidden className="text-[color:var(--accent)] shrink-0">{icon}</span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}
