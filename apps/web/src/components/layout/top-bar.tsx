import Link from 'next/link';
import { Mail, Facebook, Instagram, PackageSearch } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

/**
 * Black utility strip above the header. A thin band of admin-editable promo
 * copy on the left; order tracking, language and support contact on the
 * right. Hidden below `md`, where the same links live in the mobile drawer.
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
  promo?: string | null;
}) {
  const t = await getTranslations('nav');
  const line = promo || t('promoFallback');

  return (
    <div className="hidden md:block bg-[color:var(--color-ink)] carbon text-[color:#c9ced8] text-xs">
      <div className="shell min-h-9 flex items-center justify-between gap-4">
        <span className="truncate">{line}</span>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-ctl)] hover:text-[color:var(--accent-2)] hover:bg-white/10 transition-colors"
          >
            <PackageSearch aria-hidden className="w-3.5 h-3.5" /> {t('trackOrder')}
          </Link>

          <span className="border-l border-white/15 pl-1 ml-1">
            <LanguageSwitcher tone="dark" />
          </span>

          {(facebook || instagram) && (
            <span className="hidden lg:flex items-center gap-0.5 border-l border-white/15 pl-2 ml-1">
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="p-1.5 rounded-[var(--radius-ctl)] hover:text-[color:var(--accent-2)] hover:bg-white/10 transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-1.5 rounded-[var(--radius-ctl)] hover:text-[color:var(--accent-2)] hover:bg-white/10 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
            </span>
          )}

          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-ctl)] border-l border-white/15 ml-1 pl-3 hover:text-[color:var(--accent-2)] hover:bg-white/10 transition-colors"
            >
              <Mail aria-hidden className="w-3.5 h-3.5" /> {supportEmail}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
