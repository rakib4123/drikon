'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';

interface ActiveSale {
  id: string;
  name: string;
  endsAt: string;
  items: {
    salePrice: string | number;
    product: {
      id: string;
      name: string;
      slug: string;
      price: string | number;
      currency: string;
      images: { url: string; alt: string | null }[];
    };
  }[];
}

function useCountdown(target: string | null) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) return setLeft('00:00:00');
      const h = Math.floor(ms / 3.6e6);
      const m = Math.floor((ms % 3.6e6) / 6e4);
      const s = Math.floor((ms % 6e4) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

export function FlashSaleSection() {
  const [sale, setSale] = useState<ActiveSale | null>(null);
  const left = useCountdown(sale?.endsAt ?? null);

  useEffect(() => {
    apiGet<ActiveSale | null>('/api/v1/flash-sales/active')
      .then(setSale)
      .catch(() => setSale(null));
  }, []);

  if (!sale || sale.items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl glass aurora p-6 md:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[color:var(--accent)]/15 grid place-items-center text-[color:var(--accent)]">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)]">Flash sale</div>
              <h2 className="display text-2xl">{sale.name}</h2>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[color:var(--fg-muted)] uppercase tracking-wider mb-1">Ends in</div>
            <div className="font-mono text-2xl font-bold tabular-nums neon-text">{left}</div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sale.items.slice(0, 5).map((it) => {
            const orig = typeof it.product.price === 'string' ? parseFloat(it.product.price) : it.product.price;
            const sp = typeof it.salePrice === 'string' ? parseFloat(it.salePrice) : it.salePrice;
            const off = orig > sp ? Math.round(((orig - sp) / orig) * 100) : 0;
            return (
              <motion.div key={it.product.id} whileHover={{ y: -4 }}>
                <Link href={`/products/${it.product.slug}`} className="block rounded-2xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--bg)]">
                  <div className="relative aspect-square bg-[color:var(--bg-soft)]">
                    {it.product.images?.[0]?.url && (
                      <Image src={it.product.images[0].url} alt={it.product.images[0].alt ?? it.product.name} fill sizes="20vw" className="object-cover" />
                    )}
                    {off > 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[color:var(--accent)] text-[#06070d]">−{off}%</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium line-clamp-1">{it.product.name}</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-bold text-[color:var(--accent)]">{formatPrice(sp, it.product.currency)}</span>
                      {off > 0 && <span className="text-[11px] text-[color:var(--fg-muted)] line-through">{formatPrice(orig, it.product.currency)}</span>}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
