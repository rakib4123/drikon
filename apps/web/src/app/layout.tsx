import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from '@/components/layout/providers';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: {
    default: 'Drikon — Vision, engineered.',
    template: '%s — Drikon',
  },
  description:
    'Drikon is a modern marketplace built around taste. Discover hand-picked products from emerging and reference brands.',
  applicationName: 'Drikon',
  keywords: ['ecommerce', 'shop', 'Drikon', 'fashion', 'electronics'],
  authors: [{ name: 'Drikon Team' }],
  openGraph: {
    type: 'website',
    siteName: 'Drikon',
    title: 'Drikon — Vision, engineered.',
    description: 'A modern marketplace built around taste.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfaf5' },
    { media: '(prefers-color-scheme: dark)', color: '#14100c' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
