'use client';

import { createContext, useContext } from 'react';
import type { SiteSettings } from '@drikon/shared-types';
import type { BrandInfo } from '@/lib/settings';

const SettingsContext = createContext<SiteSettings | null>(null);

export function SettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SiteSettings {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Safe fallback so a stray client component never crashes.
    return { id: 'singleton', siteName: 'Drikon' } as SiteSettings;
  }
  return ctx;
}

/** Convenience: just the bits needed to render the brand. */
export function useBrand(): BrandInfo {
  const s = useSettings();
  return { siteName: s.siteName, logoUrl: s.logoUrl ?? null, tagline: s.tagline ?? null };
}
