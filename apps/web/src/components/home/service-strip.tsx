import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  BadgeCheck,
  CreditCard,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

/**
 * The trust row under the hero. Titles come from the admin-editable "features"
 * content, so icons are picked by keyword rather than position — reordering or
 * rewording a feature in admin keeps a fitting icon.
 */
const RULES: Array<[RegExp, LucideIcon]> = [
  // \bship, not ship: "flagship" was matching and giving "Premium devices" a truck.
  [/deliver|\bship|dispatch|courier/i, Truck],
  [/return|refund|exchange/i, RotateCcw],
  [/support|help|24\/7|service/i, Headset],
  [/pay|bkash|cash|secure|checkout/i, CreditCard],
  [/warrant|guarant|protect/i, ShieldCheck],
  [/authentic|genuine|original|official/i, BadgeCheck],
  [/premium|flagship|latest|new/i, Sparkles],
];

const iconFor = (text: string): LucideIcon => RULES.find(([re]) => re.test(text))?.[1] ?? BadgeCheck;

export function ServiceStrip({ features }: { features: { title: string; body: string }[] }) {
  if (features.length === 0) return null;
  return (
    <section className="shell py-5">
      <ul className="grid grid-cols-2 lg:grid-cols-4 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-white divide-[color:var(--border)] lg:divide-x [&>li:nth-child(n+3)]:border-t lg:[&>li:nth-child(n+3)]:border-t-0 [&>li:nth-child(even)]:border-l lg:[&>li:nth-child(even)]:border-l-0">
        {features.slice(0, 4).map((f) => {
          const Icon = iconFor(`${f.title} ${f.body}`);
          return (
            <li key={f.title} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-5 border-[color:var(--border)]">
              <span className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full bg-[color:var(--accent)]/10 text-[color:var(--accent)] grid place-items-center">
                <Icon aria-hidden className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{f.title}</span>
                <span className="hidden sm:block text-xs text-[color:var(--fg-muted)] mt-0.5 line-clamp-2">{f.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
