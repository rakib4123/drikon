'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import type { SiteSettings } from '@drikon/shared-types';
import { SettingsProvider } from '@/components/layout/settings-context';
import { ApiError } from '@/lib/api-client';

export function Providers({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,        // 1 min
            gcTime: 5 * 60_000,       // 5 min
            retry: (failureCount, err) => {
              // Don't retry on 4xx
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  // Both admin (.theme-classic) and the storefront are light themes now, so
  // the toast is always sonner's "light" variant — only the border/background
  // custom properties differ per theme (see admin/layout.tsx).
  return (
    <SettingsProvider settings={settings}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <Toaster
        theme="light"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--bg-soft)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 16px 40px -20px var(--shadow), 0 2px 8px var(--shadow)',
          },
        }}
      />
    </SettingsProvider>
  );
}
