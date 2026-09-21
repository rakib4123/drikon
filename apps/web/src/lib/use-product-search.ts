'use client';

import { useEffect, useState } from 'react';
import type { ProductListResponse, ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';

/** Minimum characters before a query is sent — one letter matches most of the catalogue. */
export const MIN_SEARCH_CHARS = 2;

/**
 * Debounced live product search, shared by the header search field and the
 * ⌘K palette so both hit the API the same way.
 *
 * Each keystroke aborts the previous in-flight request, so a slow response for
 * "ip" can never overwrite the results for "iphone".
 */
export function useProductSearch(query: string, limit = 6, debounceMs = 250) {
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await apiGet<ProductListResponse>(
          `/api/v1/products?search=${encodeURIComponent(q)}&limit=${limit}`,
          { signal: ctrl.signal },
        );
        setResults(data.items);
      } catch {
        // Aborted or failed — keep the previous results, just stop the spinner.
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, limit, debounceMs]);

  return { results, loading, setResults };
}

/** Event other components dispatch to open the ⌘K palette (optionally straight into voice). */
export const OPEN_SEARCH_EVENT = 'drikon:open-search';
export type OpenSearchDetail = { voice?: boolean };

export function openSearchPalette(detail: OpenSearchDetail = {}) {
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail }));
}
