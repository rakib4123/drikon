import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from '@/components/layout/providers';
import { TopBar } from '@/components/layout/top-bar';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CompareTray } from '@/components/shop/compare-tray';
import { getSettings } from '@/lib/settings';
import { getCategories } from '@/lib/catalog';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const tagline = s.tagline || 'Vision, engineered.';
  return {
    title: { default: `${s.siteName} — ${tagline}`, template: `%s — ${s.siteName}` },
    description: tagline,
    applicationName: s.siteName,
    keywords: ['ecommerce', 'shop', s.siteName],
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
  const brand = { siteName: s.siteName, logoUrl: s.logoUrl ?? null, tagline: s.tagline ?? null };

  // Runtime accent override from admin branding — applies across light + dark.
  const accentCss =
    s.accentColor || s.accentColor2
      ? `:root,.dark{${s.accentColor ? `--accent:${s.accentColor};--ring:${s.accentColor};` : ''}${s.accentColor2 ? `--accent-2:${s.accentColor2};` : ''}}`
      : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        {accentCss && <style dangerouslySetInnerHTML={{ __html: accentCss }} />}
        <Providers settings={s}>
          <TopBar supportEmail={s.supportEmail} facebook={s.socialFacebook} instagram={s.socialInstagram} />
          <Navbar brand={brand} categories={categories} />
          <main className="flex-1">{children}</main>
          <Footer brand={brand} />
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}
