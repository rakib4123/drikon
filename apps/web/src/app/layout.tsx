import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from '@/components/layout/providers';
import { TopBar } from '@/components/layout/top-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CompareTray } from '@/components/shop/compare-tray';
import { getSettings, resolveContent } from '@/lib/settings';
import { getCategories } from '@/lib/catalog';
import { SITE_URL } from '@/lib/site';

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
  const accentCss =
    s.accentColor || s.accentColor2
      ? `:root,.dark{${s.accentColor ? `--accent:${s.accentColor};--ring:${s.accentColor};` : ''}${s.accentColor2 ? `--accent-2:${s.accentColor2};` : ''}}`
      : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
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
      </body>
    </html>
  );
}
