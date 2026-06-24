'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,        // 1 min
            gcTime: 5 * 60_000,       // 5 min
            retry: (failureCount, err: any) => {
              // Don't retry on 4xx
              if (err?.status >= 400 && err?.status < 500) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <Toaster
        theme="system"
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--bg-soft)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
          },
        }}
      />
    </ThemeProvider>
  );
}
