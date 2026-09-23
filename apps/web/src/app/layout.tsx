import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Hind_Siliguri, JetBrains_Mono, Chakra_Petch } from 'next/font/google';
import '../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from '@/components/layout/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CompareTray } from '@/components/shop/compare-tray';
import { SiteChrome } from '@/components/layout/site-chrome';
import { getSettings, resolveContent } from '@/lib/settings';
import { getCategories, getTopBrands } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';
import { accentForeground } from '@/lib/contrast';

// Self-hosted via next/font: no render-blocking stylesheet round-trip to Google,
// automatic `font-display: swap`, and a size-adjusted fallback so swapping the
// webfont in doesn't shift the layout.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

// Bangla glyph coverage. Plus Jakarta Sans has no Bengali, so without this the
// bn locale fell back to whatever font the device happened to have. It sits
// second in --font-sans, so the browser uses it per-glyph for Bengali only.
const bangla = Hind_Siliguri({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bangla',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Technical display face for the megastore headings; body copy stays Plus Jakarta.
const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-chakra',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const content = resolveContent(s);
  const tagline = s.tagline || 'Vision, engineered.';
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${s.siteName} — ${tagline}`, template: `%s — ${s.siteName}` },
    description: tagline,
    applicationName: s.siteName,
    keywords: [...content.seoKeywords, s.siteName],
    ...(s.faviconUrl ? { icons: { icon: s.faviconUrl } } : {}),
    openGraph: {
      type: 'website',
      siteName: s.siteName,
      title: `${s.siteName} — ${tagline}`,
      description: tagline,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  // Matches the megastore's black bands (top bar, category bar, footer).
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, categories, brands] = await Promise.all([getSettings(), getCategories(), getTopBrands()]);
  const [locale, messages, t] = await Promise.all([getLocale(), getMessages(), getTranslations('common')]);
  const content = resolveContent(s);
  const brand = { siteName: s.siteName, logoUrl: s.logoUrl ?? null, tagline: s.tagline ?? null };

  // Runtime accent override from admin branding. The storefront's own accent
  // is fixed black (buttons/headings), so on :root the admin-picked brand
  // colour instead drives the bronze highlight and focus ring (--color-accent-2
  // / --color-ring) — it never touches --color-accent there. Admin
  // (.theme-classic) keeps the full override, including --color-accent, so it
  // still previews the brand accent instead of staying pinned to its
  // hardcoded #0b57d0; --color-accent-fg is recomputed from the accent's WCAG
  // relative luminance there too, since an arbitrary admin-picked accent can
  // be light or dark and the fixed #03121a default only reads well against
  // light ones. Sets the --color-* theme tokens (not the aliases), so both
  // the hand-written `var(--accent)` call sites AND the Tailwind-generated
  // utilities that read --color-accent pick the brand colour up without a
  // redeploy.
  //
  // These values are interpolated directly into a <style> tag below, so
  // they're re-validated as strict 6-digit hex here — anything else
  // (including a malicious `}color:red;` breakout attempt) is treated as
  // unset rather than trusted from the admin-settings payload.
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const safeAccent = s.accentColor && HEX.test(s.accentColor) ? s.accentColor : undefined;
  const safeAccent2 = s.accentColor2 && HEX.test(s.accentColor2) ? s.accentColor2 : undefined;

  const storefrontAccent = safeAccent
    ? `:root{--color-accent-2:${safeAccent};--color-ring:${safeAccent};}`
    : '';
  const adminAccent =
    safeAccent || safeAccent2
      ? `.theme-classic{${
          safeAccent
            ? `--color-accent:${safeAccent};--color-ring:${safeAccent};--color-accent-fg:${accentForeground(safeAccent)};`
            : ''
        }${safeAccent2 ? `--color-accent-2:${safeAccent2};` : ''}}`
      : '';
  const accentCss = storefrontAccent + adminAccent || null;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${jakarta.variable} ${bangla.variable} ${jetbrainsMono.variable} ${chakraPetch.variable}`}
    >
      <body>
        {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
        <div className="relative z-10 min-h-screen flex flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[color:var(--accent)] focus:text-[color:var(--accent-fg)] focus:font-medium"
          >
            {t('skipToContent')}
          </a>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers settings={s}>
              <SiteChrome
                header={<Navbar brand={brand} categories={categories} brands={brands} />}
                footer={
                  <Footer
                    brand={brand}
                    categories={categories}
                    note={content.footerNote}
                    supportEmail={s.supportEmail}
                    facebook={s.socialFacebook}
                    instagram={s.socialInstagram}
                    // Unset means enabled — mirrors how checkout treats these flags.
                    payments={{ bkash: s.bkashEnabled !== false, cod: s.codEnabled !== false }}
                  />
                }
                extras={<CompareTray />}
              >
                {children}
              </SiteChrome>
            </Providers>
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
