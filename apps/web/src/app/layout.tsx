import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Hind_Siliguri, JetBrains_Mono, Fraunces } from 'next/font/google';
import '../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from '@/components/layout/providers';
import { TopBar } from '@/components/layout/top-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CompareTray } from '@/components/shop/compare-tray';
import { SiteChrome } from '@/components/layout/site-chrome';
import { getSettings, resolveContent } from '@/lib/settings';
import { getCategories } from '@/lib/catalog';
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

// Serif display face for the warm editorial headings; body copy stays Plus Jakarta.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
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
  // Matches the dark storefront background.
  themeColor: '#f5f1ea',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, categories] = await Promise.all([getSettings(), getCategories()]);
  const [locale, messages, t] = await Promise.all([getLocale(), getMessages(), getTranslations('common')]);
  const content = resolveContent(s);
  const brand = { siteName: s.siteName, logoUrl: s.logoUrl ?? null, tagline: s.tagline ?? null };

  // Runtime accent override from admin branding — applies to both the
  // storefront (:root) and the admin surface (.theme-classic), so admin
  // previews the brand accent too instead of staying pinned to its hardcoded
  // #0b57d0. Sets the --color-* theme tokens (not the aliases), so both the
  // hand-written `var(--accent)` call sites AND the Tailwind-generated
  // utilities that read --color-accent pick the brand colour up without a
  // redeploy. --color-accent-fg is recomputed from the accent's WCAG relative
  // luminance too — an arbitrary admin-picked accent can be light or dark, and
  // the fixed #03121a default only reads well against light ones.
  const accentCss =
    s.accentColor || s.accentColor2
      ? `:root,.theme-classic{${
          s.accentColor
            ? `--color-accent:${s.accentColor};--color-ring:${s.accentColor};--color-accent-fg:${accentForeground(s.accentColor)};`
            : ''
        }${s.accentColor2 ? `--color-accent-2:${s.accentColor2};` : ''}}`
      : null;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${jakarta.variable} ${bangla.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
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
                header={
                  <>
                    <TopBar supportEmail={s.supportEmail} facebook={s.socialFacebook} instagram={s.socialInstagram} promo={content.topbarPromo} />
                    <Navbar brand={brand} categories={categories} />
                  </>
                }
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
