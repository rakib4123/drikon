'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronDown, Check, ShieldCheck, Zap } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { AddToCart } from '@/components/shop/add-to-cart';
import type { ProductSummary } from '@drikon/shared-types';

interface ProductDetail extends ProductSummary {
  description: string;
  sku: string;
  attributes?: Record<string, any> | null;
  brandId?: string | null;
  categoryId: string;
}

interface PremiumProductPageProps {
  product: ProductDetail;
  related: ProductSummary[];
}

export function PremiumProductPage({ product, related }: PremiumProductPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

  // Header background opacity
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const [activeTab, setActiveTab] = useState<'overview' | 'specs'>('overview');

  // Smooth scroll to specs
  const scrollToSpecs = () => {
    document.getElementById('specs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="relative bg-[#050505] text-neutral-300 min-h-screen font-sans selection:bg-[#d4af37]/30 selection:text-white pb-24">
      {/* Sticky Header */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-neutral-800/50"
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
            <div className="w-32">
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
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image / Pattern */}
        <div className="absolute inset-0 z-0">
          {product.images?.[0]?.url ? (
            <>
              <Image
                src={product.images[0].url}
                alt={product.name}
                fill
                className="object-cover opacity-30 scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-[#050505]" />
          )}
        </div>

        {/* Hero Content */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          {product.brand && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-[#d4af37] tracking-[0.3em] text-sm md:text-base uppercase font-bold mb-6"
            >
              {product.brand.name} • 20th Anniversary Edition
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-8 leading-[1.1]"
          >
            INNOVATE. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#f3e5ab]">PERFORM.</span> DOMINATE.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto font-light mb-12"
          >
            {product.shortDescription || "Experience the pinnacle of engineering and design. The ultimate collector's edition for the true enthusiast."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex items-center justify-center gap-6"
          >
            <button
              onClick={scrollToSpecs}
              className="px-8 py-4 rounded-full border border-neutral-700 hover:border-[#d4af37] text-white transition-colors duration-300"
            >
              Discover Engineering
            </button>
            <div className="w-40">
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
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-neutral-500"
        >
          <span className="text-xs uppercase tracking-widest mb-2">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 px-6 relative z-10 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">A Legacy Forged in Titanium</h2>
            <p className="text-neutral-400 text-lg leading-relaxed">
              For two decades, we have stood at the forefront of innovation, pushing boundaries and defining excellence. 
              More than an aesthetic, this exclusive colorway reflects core values that are a testament to an enduring legacy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-6 border border-neutral-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <div className="w-4 h-4 bg-black rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">ROG Black</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                The "Crown of Shadows" provides a profound, sophisticated canvas that grounds the legacy. It represents formidable power, stealth, and premium quality.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#1a0505] flex items-center justify-center mb-6 border border-[#ff0000]/20 shadow-[0_0_15px_rgba(255,0,0,0.1)]">
                <div className="w-4 h-4 bg-[#ff0000] rounded-full shadow-[0_0_10px_rgba(255,0,0,0.5)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Classic Red</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                A vital spark and direct link to our heritage. It's the pulse of the product, a vibrant accent that signifies passion, intensity, and the gaming spirit.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.4 }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-full bg-[#1a180d] flex items-center justify-center mb-6 border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.15)] relative z-10">
                <div className="w-4 h-4 bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
              </div>
              <h3 className="text-xl font-bold text-[#d4af37] mb-3 relative z-10">Radiant Gold</h3>
              <p className="text-neutral-400 text-sm leading-relaxed relative z-10">
                To honor two decades of groundbreaking achievements, adorned with gold. Signifying premium craftsmanship, exclusivity, and a celebratory spirit.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content & Specs */}
      <section id="specs" className="py-24 px-6 relative z-10 bg-black/40">
        <div className="max-w-7xl mx-auto">
          {/* Main Layout Grid */}
          <div className="grid lg:grid-cols-2 gap-16">
            
            {/* Left: Product Imagery Showcase */}
            <div className="space-y-8">
              {product.images?.map((img, idx) => (
                <motion.div
                  key={img.url}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6 }}
                  className={`relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 ${
                    idx === 0 ? "aspect-square" : "aspect-[4/3]"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${product.name} image ${idx + 1}`}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />
                </motion.div>
              ))}
            </div>

            {/* Right: Technical Specs & Details */}
            <div className="lg:sticky lg:top-32 h-fit">
              <div className="mb-10">
                <h2 className="text-4xl font-bold text-white mb-6">Technical Mastery</h2>
                <div className="prose prose-invert prose-p:text-neutral-400 prose-p:leading-relaxed max-w-none whitespace-pre-wrap">
                  {product.description}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-neutral-800 mb-8 flex gap-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-4 text-sm font-bold tracking-wider uppercase transition-colors relative ${
                    activeTab === 'overview' ? 'text-[#d4af37]' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Highlights
                  {activeTab === 'overview' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-4 text-sm font-bold tracking-wider uppercase transition-colors relative ${
                    activeTab === 'specs' ? 'text-[#d4af37]' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Specifications
                  {activeTab === 'specs' && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37]" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {[
                      { icon: ShieldCheck, title: "Premium Build Quality", desc: "Constructed with aerospace-grade aluminum and tempered glass." },
                      { icon: Zap, title: "Uncompromising Performance", desc: "Engineered to deliver maximum output under extreme conditions." },
                      { icon: Check, title: "20th Anniversary Exclusivity", desc: "Limited edition serial numbers and bespoke packaging." }
                    ].map((feature, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-xl bg-neutral-900/30 border border-neutral-800/50">
                        <div className="shrink-0 mt-1">
                          <feature.icon className="w-6 h-6 text-[#d4af37]" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium mb-1">{feature.title}</h4>
                          <p className="text-sm text-neutral-400">{feature.desc}</p>
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
                      <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800">
                        {Object.entries(product.attributes).map(([key, value]) => (
                          <div key={key} className="flex p-4 bg-neutral-900/20 hover:bg-neutral-900/40 transition-colors">
                            <span className="w-1/3 text-neutral-500 capitalize">{key}</span>
                            <span className="w-2/3 text-white font-medium">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-neutral-500 bg-neutral-900/20 rounded-xl border border-neutral-800">
                        Detailed specifications are not available for this product.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Buy Area */}
              <div className="mt-12 p-6 rounded-2xl bg-gradient-to-b from-neutral-900/80 to-black border border-neutral-800 shadow-2xl">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <span className="block text-neutral-500 text-sm mb-1">Edition 20 Pricing</span>
                    <span className="text-4xl font-bold text-white tracking-tight">
                      {formatPrice(price, product.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm text-[#d4af37] font-medium mb-1">In Stock</span>
                    <span className="text-xs text-neutral-500">Ships within 24 hours</span>
                  </div>
                </div>
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
                  className="w-full h-14 text-lg bg-[#d4af37] hover:bg-[#b5952f] text-black border-none rounded-xl font-bold"
                />
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
