import Link from 'next/link';
import { Mail, Facebook, Instagram, Banknote, Smartphone } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { BrandMark } from '@/components/layout/brand-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import type { BrandInfo } from '@/lib/settings';
import type { NavCategory } from '@/lib/catalog';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

interface FooterProps {
  brand: BrandInfo;
  categories?: NavCategory[];
  note?: string;
  supportEmail?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  /** Which checkout methods are switched on in admin settings — only those are advertised. */
  payments: { bkash: boolean; cod: boolean };
}

/** Ink footer: brand + tagline, categories, help, contact + socials, then payments/language/copyright. */
export async function Footer({ brand, categories = [], note, supportEmail, facebook, instagram, payments }: FooterProps) {
  const t = await getTranslations('nav');
  const locale = (await getLocale()) as Locale;
  const topCats = categories.filter((c) => !c.parentId).slice(0, 6);
  const hasContact = !!(supportEmail || facebook || instagram);

  return (
    <footer className="mt-16 bg-[color:var(--color-ink)] text-[color:var(--border-strong)] text-sm">
      <div className={`shell py-14 grid gap-10 sm:grid-cols-2 ${hasContact ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <div>
          <BrandMark brand={brand} href={null} showTagline inverted />
          <p className="mt-4 max-w-xs leading-relaxed">{brand.tagline || t('footerAbout')}</p>
        </div>

        <FooterColumn title={t('shop')}>
          <FooterLink href="/products">{t('allProducts')}</FooterLink>
          {topCats.map((c) => (
            <FooterLink key={c.id} href={`/products?category=${c.slug}`}>
              {localize(c.name, c.nameBn, locale)}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t('customerService')}>
          <FooterLink href="/orders">{t('trackOrder')}</FooterLink>
          <FooterLink href="/shipping-returns">{t('shippingReturns')}</FooterLink>
          <FooterLink href="/contact">{t('contact')}</FooterLink>
          <FooterLink href="/privacy">{t('privacyPolicy')}</FooterLink>
          <FooterLink href="/terms">{t('termsOfService')}</FooterLink>
        </FooterColumn>

        {hasContact && (
          <div>
            <h2 className="font-display font-semibold text-[color:var(--surface-solid)] text-[15px] mb-4">{t('contact')}</h2>
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 text-[color:var(--surface-solid)] hover:text-[color:var(--accent-2)] transition-colors"
              >
                <Mail aria-hidden className="w-4 h-4" /> {supportEmail}
              </a>
            )}
            {(facebook || instagram) && (
              <div className="mt-5 flex gap-2">
                {facebook && (
                  <SocialLink href={facebook} label="Facebook">
                    <Facebook className="w-4 h-4" />
                  </SocialLink>
                )}
                {instagram && (
                  <SocialLink href={instagram} label="Instagram">
                    <Instagram className="w-4 h-4" />
                  </SocialLink>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="shell py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {(payments.bkash || payments.cod) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[color:var(--border-strong)]">{t('weAccept')}</span>
              {payments.bkash && (
                <span className="inline-flex items-center gap-2 rounded-md bg-[color:var(--surface-solid)] px-3 py-1.5 text-[13px] font-extrabold text-[#e2136e]">
                  <Smartphone aria-hidden className="w-4 h-4" /> bKash
                </span>
              )}
              {payments.cod && (
                <span className="inline-flex items-center gap-2 rounded-md bg-[color:var(--surface-solid)] px-3 py-1.5 text-[13px] font-bold text-[color:var(--color-ink)]">
                  <Banknote aria-hidden className="w-4 h-4" /> {t('cashOnDelivery')}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <LanguageSwitcher tone="dark" />
            <span className="whitespace-nowrap">
              © {new Date().getFullYear()} {brand.siteName}. {t('allRightsReserved')}
            </span>
            {note && <span className="whitespace-nowrap">{note}</span>}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display font-semibold text-[color:var(--surface-solid)] text-[15px] mb-4">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-[color:var(--surface-solid)] hover:underline underline-offset-4 transition-colors">
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-[color:var(--surface-solid)] hover:text-[color:var(--accent-2)] grid place-items-center transition-colors"
    >
      {children}
    </a>
  );
}
