'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight, Check, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';

export interface ShowcaseItem {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  currency: string;
  stock: number;
  averageRating: number;
  reviewCount: number;
  images?: { url: string; alt?: string | null }[];
  brand?: { name: string } | null;
  category: { name: string };
  attributes?: Record<string, unknown> | null;
}

const toNum = (v: string | number) => (typeof v === 'string' ? parseFloat(v) : v);

export function ShowcaseProduct({ product, index }: { product: ShowcaseItem; index: number }) {
  const add = useCartStore((s) => s.add);
  const reversed = index % 2 === 1;
  const price = toNum(product.price);
  const compareAt = product.compareAtPrice ? toNum(product.compareAtPrice) : null;
  const onSale = compareAt && compareAt > price;
  const img = product.images?.[0]?.url;
  const blurb = product.shortDescription || product.description?.slice(0, 180);
  const specs = product.attributes ? Object.entries(product.attributes).slice(0, 6) : [];

  const addToCart = () => {
    add({ productId: product.id, name: product.name, slug: product.slug, image: img, unitPrice: price, currency: product.currency });
    toast.success('Added to cart', { description: product.name });
  };

  return (
    <section className="relative py-16 md:py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={reversed ? 'lg:order-2' : ''}
        >
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a2b4d] to-[#0b1322] ring-1 ring-white/10 shadow-[0_40px_120px_-40px_rgba(239,106,32,0.45)]">
            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_50%_40%,rgba(239,106,32,0.28),transparent_60%)]" />
            {img && (
              <Image src={img} alt={product.images?.[0]?.alt ?? product.name} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            )}
          </div>
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-[#ef8a4d] mb-3">
            {product.brand?.name ?? product.category.name} · Featured
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{product.name}</h2>
          {blurb && <p className="text-white/65 text-lg leading-relaxed mb-7 max-w-lg">{blurb}</p>}

          {specs.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-8 max-w-lg">
              {specs.map(([k, v]) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-[#ef6a20] mt-0.5 shrink-0" />
                  <span className="text-white/80">
                    <span className="text-white/45 capitalize">{k}: </span>
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-4 mb-8">
            <span className="text-3xl font-bold">{formatPrice(price, product.currency)}</span>
            {onSale && compareAt && (
              <span className="text-white/40 line-through text-lg">{formatPrice(compareAt, product.currency)}</span>
            )}
            {product.averageRating > 0 && (
              <span className="inline-flex items-center gap-1 text-white/60 text-sm">
                <Star className="w-4 h-4 fill-[#f5a524] text-[#f5a524]" /> {product.averageRating.toFixed(1)} ({product.reviewCount})
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addToCart}
              disabled={product.stock === 0}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ef6a20] text-white font-semibold hover:bg-[#d85f1a] transition-colors disabled:opacity-50"
            >
              <ShoppingBag className="w-4 h-4" /> {product.stock === 0 ? 'Sold out' : 'Add to cart'}
            </button>
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
