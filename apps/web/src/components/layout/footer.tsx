import Link from 'next/link';
import { Mail, Facebook, Instagram, Banknote, Smartphone } from 'lucide-react';
import { getTranslations, getLocale } from 'next-intl/server';
import { BrandMark } from '@/components/layout/brand-mark';
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

/** Deep-navy megastore footer: brand + contact, three link columns, accepted payments. */
export async function Footer({ brand, categories = [], note, supportEmail, facebook, instagram, payments }: FooterProps) {
  const t = await getTranslations('nav');
  const locale = (await getLocale()) as Locale;
  const topCats = categories.filter((c) => !c.parentId).slice(0, 6);

  return (
    <footer className="mt-16 bg-[color:var(--color-ink)] text-white/70 text-sm">
      <div className="shell py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
        <div>
          <BrandMark brand={brand} href={null} showTagline inverted />
          <p className="mt-4 max-w-xs leading-relaxed">
            {brand.tagline || t('footerAbout')}
          </p>
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="mt-5 inline-flex items-center gap-2 text-white hover:text-[color:var(--accent-2)] transition-colors">
              <Mail aria-hidden className="w-4 h-4" /> {supportEmail}
            </a>
          )}
          {(facebook || instagram) && (
            <div className="mt-5 flex gap-2">
              {facebook && <SocialLink href={facebook} label="Facebook"><Facebook className="w-4 h-4" /></SocialLink>}
              {instagram && <SocialLink href={instagram} label="Instagram"><Instagram className="w-4 h-4" /></SocialLink>}
            </div>
          )}
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
          <FooterLink href="/dashboard">{t('myAccount')}</FooterLink>
          <FooterLink href="/wishlist">{t('wishlist')}</FooterLink>
          <FooterLink href="/compare">{t('compare')}</FooterLink>
          <FooterLink href="/shipping-returns">{t('shippingReturns')}</FooterLink>
        </FooterColumn>

        <FooterColumn title={t('company')}>
          <FooterLink href="/about">{t('about')}</FooterLink>
          <FooterLink href="/contact">{t('contact')}</FooterLink>
          <FooterLink href="/terms">{t('termsOfService')}</FooterLink>
          <FooterLink href="/privacy">{t('privacyPolicy')}</FooterLink>
        </FooterColumn>

        {(payments.bkash || payments.cod) && (
          <div>
            <h2 className="text-white font-bold text-[15px] mb-4">{t('weAccept')}</h2>
            <div className="flex flex-wrap gap-2">
              {payments.bkash && (
                <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[13px] font-extrabold text-[#e2136e]">
                  <Smartphone aria-hidden className="w-4 h-4" /> bKash
                </span>
              )}
              {payments.cod && (
                <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[13px] font-bold text-[color:var(--color-ink)]">
                  <Banknote aria-hidden className="w-4 h-4" /> {t('cashOnDelivery')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="shell py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/50">
          <span>© {new Date().getFullYear()} {brand.siteName}. {t('allRightsReserved')}</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white font-bold text-[15px] mb-4">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-white hover:underline underline-offset-4 transition-colors">
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
      className="w-9 h-9 rounded-full bg-white/10 hover:bg-[color:var(--accent)] text-white grid place-items-center transition-colors"
    >
      {children}
    </a>
  );
}
