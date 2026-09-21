import type { Metadata, Viewport } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from '@/components/layout/providers';
import { ParticleField } from '@/components/layout/particle-field';
import { TopBar } from '@/components/layout/top-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CompareTray } from '@/components/shop/compare-tray';
import { getSettings, resolveContent } from '@/lib/settings';
import { getCategories } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

// Self-hosted via next/font: no render-blocking stylesheet round-trip to Google,
// automatic `font-display: swap`, and a size-adjusted fallback so swapping the
// webfont in doesn't shift the layout.
const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-geist',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [s, categories] = await Promise.all([getSettings(), getCategories()]);
  const [locale, messages, t] = await Promise.all([getLocale(), getMessages(), getTranslations('common')]);
  const content = resolveContent(s);
  const brand = { siteName: s.siteName, logoUrl: s.logoUrl ?? null, tagline: s.tagline ?? null };

  // Runtime accent override from admin branding — applies across light + dark.
  // Sets the --color-* theme tokens (not the aliases), so both the hand-written
  // `var(--accent)` call sites AND the Tailwind-generated utilities that read
  // --color-accent pick the brand colour up without a redeploy.
  const accentCss =
    s.accentColor || s.accentColor2
      ? `:root,.dark{${s.accentColor ? `--color-accent:${s.accentColor};--color-ring:${s.accentColor};` : ''}${s.accentColor2 ? `--color-accent-2:${s.accentColor2};` : ''}}`
      : null;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
        <ParticleField />
        <div className="relative z-10 min-h-screen flex flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[color:var(--accent)] focus:text-white focus:font-medium"
          >
            {t('skipToContent')}
          </a>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers settings={s}>
              <TopBar supportEmail={s.supportEmail} facebook={s.socialFacebook} instagram={s.socialInstagram} promo={content.topbarPromo} />
              <Navbar brand={brand} categories={categories} />
              <main id="main" className="flex-1">{children}</main>
              <Footer brand={brand} categories={categories} note={content.footerNote} />
              <CompareTray />
            </Providers>
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}
