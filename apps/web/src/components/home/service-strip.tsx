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
 * The admin-editable feature row near the top of the homepage — delivery,
 * returns, genuine devices, support — with orange icons on white inside a
 * single `.card`. Icons are matched by keyword, not position, so reordering
 * or rewording a feature in admin keeps a fitting icon.
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
    <section className="shell py-6 @container">
      <ul className="card !p-0 grid grid-cols-1 divide-[color:var(--border)] @[30rem]:grid-cols-2 @[60rem]:grid-cols-4 @[60rem]:divide-x [&>li]:border-t [&>li:first-child]:border-t-0 @[30rem]:[&>li]:border-t-0 @[30rem]:[&>li:nth-child(n+3)]:border-t @[30rem]:[&>li:nth-child(even)]:border-l @[60rem]:[&>li:nth-child(n+3)]:border-t-0 @[60rem]:[&>li:nth-child(even)]:border-l-0">
        {features.slice(0, 4).map((f) => {
          const Icon = iconFor(`${f.title} ${f.body}`);
          return (
            <li key={f.title} className="flex items-center gap-2.5 border-[color:var(--border)] p-3 sm:gap-3 sm:p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--accent-2)]/15 text-[color:var(--accent-2)] sm:h-11 sm:w-11">
                <Icon aria-hidden className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-bold leading-tight">{f.title}</span>
                <span className="mt-0.5 hidden text-xs text-[color:var(--fg-muted)] line-clamp-2 sm:block">{f.body}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
