import { Boxes, Truck, ShieldCheck, Headphones } from 'lucide-react';
import type { ReactNode } from 'react';

const STATS: { icon: ReactNode; value: string; label: string }[] = [
  { icon: <Boxes className="w-5 h-5" />, value: '500+', label: 'Components in stock' },
  { icon: <Truck className="w-5 h-5" />, value: '24h', label: 'Same-day dispatch' },
  { icon: <ShieldCheck className="w-5 h-5" />, value: '100%', label: 'Genuine parts' },
  { icon: <Headphones className="w-5 h-5" />, value: '7-day', label: 'Maker support' },
];

/** Full-width gradient stats band — a confident "enterprise" trust strip. */
export function StatsBand() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-drikon-gradient grain text-white">
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#14233f]/30 px-6 py-8 flex flex-col items-center text-center gap-2">
              <span className="w-11 h-11 rounded-xl bg-white/12 grid place-items-center text-white">
                {s.icon}
              </span>
              <div className="display text-3xl md:text-4xl">{s.value}</div>
              <div className="text-xs md:text-sm text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
