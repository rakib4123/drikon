import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from '@/components/layout/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { getSettings } from '@/lib/settings';

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
    { media: '(prefers-color-scheme: light)', color: '#eef2fc' },
    { media: '(prefers-color-scheme: dark)', color: '#06070d' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
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
          <Navbar brand={brand} />
          <main className="flex-1">{children}</main>
          <Footer brand={brand} />
        </Providers>
      </body>
    </html>
  );
}
