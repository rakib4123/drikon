import { Truck, RotateCcw, BadgeCheck, Headset, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const ITEMS: { key: 'trustDelivery' | 'trustReturns' | 'trustGenuine' | 'trustSupport'; Icon: LucideIcon }[] = [
  { key: 'trustDelivery', Icon: Truck },
  { key: 'trustReturns', Icon: RotateCcw },
  { key: 'trustGenuine', Icon: BadgeCheck },
  { key: 'trustSupport', Icon: Headset },
];

/**
 * Fixed trust row — free delivery, returns, genuine devices, support — shown
 * at the foot of the homepage. Replaces the admin-editable ServiceStrip with
 * copy that's always present regardless of the "features" content setting.
 */
export async function TrustStrip() {
  const t = await getTranslations('home');
  return (
    <section className="shell py-8 @container">
      <ul className="grid grid-cols-1 @[30rem]:grid-cols-2 @[60rem]:grid-cols-4 rounded-[var(--radius-card)] border border-[color:var(--border)] bg-[color:var(--surface)] divide-[color:var(--border)] @[60rem]:divide-x [&>li]:border-t [&>li:first-child]:border-t-0 @[30rem]:[&>li]:border-t-0 @[30rem]:[&>li:nth-child(n+3)]:border-t @[30rem]:[&>li:nth-child(even)]:border-l @[60rem]:[&>li:nth-child(n+3)]:border-t-0 @[60rem]:[&>li:nth-child(even)]:border-l-0">
        {ITEMS.map(({ key, Icon }) => (
          <li key={key} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-5 border-[color:var(--border)]">
            <span className="grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-[color:var(--accent-2)]/10 text-[color:var(--accent-2)]">
              <Icon aria-hidden className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" />
            </span>
            <span className="text-sm font-bold leading-tight">{t(key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
