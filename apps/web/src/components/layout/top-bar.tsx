import Link from 'next/link';
import { Facebook, Instagram, Mail, Truck, PackageSearch } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

/**
 * Navy utility bar above the header: the admin-editable promo on the left,
 * order tracking, support contact, socials and language on the right.
 * Hidden on phones, where the same links live in the mobile drawer.
 */
export async function TopBar({
  supportEmail,
  facebook,
  instagram,
  promo,
}: {
  supportEmail?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  promo: string;
}) {
  const t = await getTranslations('nav');

  return (
    <div className="hidden sm:block bg-[color:var(--color-ink)] text-white/80 text-xs">
      <div className="shell h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Truck aria-hidden className="w-3.5 h-3.5 text-[color:var(--accent-2)] shrink-0" />
          <span className="truncate">{promo}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link href="/orders" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:text-white hover:bg-white/10 transition-colors">
            <PackageSearch aria-hidden className="w-3.5 h-3.5" /> {t('trackOrder')}
          </Link>
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:text-white hover:bg-white/10 transition-colors"
            >
              <Mail aria-hidden className="w-3.5 h-3.5" /> {supportEmail}
            </a>
          )}
          {(facebook || instagram) && (
            <span className="flex items-center gap-0.5 border-l border-white/15 pl-2 ml-1">
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-1.5 rounded-md hover:text-white hover:bg-white/10 transition-colors">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-1.5 rounded-md hover:text-white hover:bg-white/10 transition-colors">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
            </span>
          )}
          <span className="border-l border-white/15 pl-2 ml-1">
            <LanguageSwitcher tone="dark" />
          </span>
        </div>
      </div>
    </div>
  );
}
