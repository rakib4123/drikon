'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, ChevronDown, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { AddToCart } from '@/components/shop/add-to-cart';
import type { ProductSummary } from '@drikon/shared-types';

interface ProductDetail extends ProductSummary {
  description: string;
  sku: string;
  attributes?: Record<string, unknown> | null;
  brandId?: string | null;
  categoryId: string;
}

interface PremiumProductPageProps {
  product: ProductDetail;
  related: ProductSummary[];
}

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: 'Authentic, guaranteed',
    desc: 'Sourced through official channels and covered by the manufacturer warranty.',
  },
  {
    icon: Truck,
    title: 'Fast, tracked delivery',
    desc: 'Dispatched within 24 hours, tracked from our warehouse to your door.',
  },
  {
    icon: Headphones,
    title: 'Real support',
    desc: "Questions after you buy? A real person answers — not a script.",
  },
];

export function PremiumProductPage({ product }: PremiumProductPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, reduce ? 0 : 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const [activeTab, setActiveTab] = useState<'overview' | 'specs'>('overview');

  const scrollToSpecs = () => {
    document.getElementById('specs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="relative bg-[#0a0a0a] text-neutral-300 min-h-screen pb-24">
      {/* Sticky Header */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/85 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-neutral-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-medium text-white truncate max-w-[200px] md:max-w-md">
              {product.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-white hidden sm:block">
              {formatPrice(price, product.currency)}
            </span>
            <AddToCart
              compact
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
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {product.images?.[0]?.url ? (
            <>
              <Image
                src={product.images[0].url}
                alt={product.name}
                fill
                className="object-cover opacity-40 scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-drikon-gradient" />
          )}
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        >
          {product.brand && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-neutral-400 tracking-[0.3em] text-sm md:text-base uppercase font-semibold mb-6"
            >
              {product.brand.name}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1]"
          >
            {product.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto font-light mb-12"
          >
            {product.shortDescription || 'Chosen because it earns a place here — not because it was easy to source.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <button
              onClick={scrollToSpecs}
              className="px-8 py-4 rounded-full border border-white/20 hover:border-white/50 text-white transition-colors duration-300"
            >
              See the details
            </button>
            <AddToCart
              compact
              className="!px-8 !py-4 !rounded-full text-base"
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
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-neutral-500"
        >
          <span className="text-xs uppercase tracking-widest mb-2">Scroll to explore</span>
          {!reduce && (
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Main Content & Specs */}
      <section id="specs" className="py-24 px-6 relative z-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left: Product Imagery */}
            <div className="space-y-8">
              {product.images?.map((img, idx) => (
                <motion.div
                  key={img.url}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6 }}
                  className={`relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 ${
                    idx === 0 ? 'aspect-square' : 'aspect-[4/3]'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${product.name} image ${idx + 1}`}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                </motion.div>
              ))}
            </div>

            {/* Right: Details */}
            <div className="lg:sticky lg:top-32 h-fit">
              <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">The details</h2>
                <div className="text-neutral-400 leading-relaxed whitespace-pre-wrap">{product.description}</div>
              </div>

              {/* Tabs */}
              <div className="border-b border-white/10 mb-8 flex gap-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-4 text-sm font-semibold tracking-wider uppercase transition-colors relative ${
                    activeTab === 'overview' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Highlights
                  {activeTab === 'overview' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-4 text-sm font-semibold tracking-wider uppercase transition-colors relative ${
                    activeTab === 'specs' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Specifications
                  {activeTab === 'specs' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {HIGHLIGHTS.map((h) => (
                      <div key={h.title} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="shrink-0 mt-1">
                          <h.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-1">{h.title}</h4>
                          <p className="text-sm text-neutral-400">{h.desc}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="specs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {product.attributes && Object.keys(product.attributes).length > 0 ? (
                      <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10">
                        {Object.entries(product.attributes).map(([key, value]) => (
                          <div key={key} className="flex p-4 bg-white/5 hover:bg-white/10 transition-colors">
                            <span className="w-1/3 text-neutral-500 capitalize">{key}</span>
                            <span className="w-2/3 text-white font-medium">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-neutral-500 bg-white/5 rounded-xl border border-white/10">
                        Detailed specifications are not available for this product.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buy box */}
              <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-end justify-between mb-6 gap-4">
                  <div>
                    <span className="block text-neutral-500 text-sm mb-1">Price</span>
                    <span className="text-4xl font-bold text-white tracking-tight">
                      {formatPrice(price, product.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    {product.stock === 0 ? (
                      <span className="text-sm text-red-400 font-medium">Out of stock</span>
                    ) : product.stock <= 5 ? (
                      <span className="text-sm text-amber-400 font-medium">Only {product.stock} left</span>
                    ) : (
                      <span className="text-sm text-emerald-400 font-medium">In stock</span>
                    )}
                    <span className="block text-xs text-neutral-500 mt-1">Ships within 24 hours</span>
                  </div>
                </div>
                <AddToCart
                  compact
                  className="w-full h-14"
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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
