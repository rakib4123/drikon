'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X, Loader2, CornerDownLeft } from 'lucide-react';
import type { ProductListResponse, ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // ⌘K / Ctrl+K to open, Esc handled by the panel below.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock scroll + focus input while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [open]);

  // Debounced live search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const data = await apiGet<ProductListResponse>(
          `/api/v1/products?search=${encodeURIComponent(q)}&limit=6`,
          { signal: ctrl.signal },
        );
        setResults(data.items);
      } catch {
        // Aborted or failed — leave prior results, just stop the spinner.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const goToResults = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    close();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  }, [query, close, router]);

  const pick = useCallback(
    (slug: string) => {
      close();
      router.push(`/products/${slug}`);
    },
    [close, router],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-[color:var(--bg-soft)] transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
              aria-hidden
            />

            {/* Panel */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search products"
              className="relative w-full max-w-xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') close();
                if (e.key === 'Enter') goToResults();
              }}
            >
              <div className="flex items-center gap-3 px-4 border-b border-[color:var(--border)]">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[color:var(--fg-muted)]" />
                ) : (
                  <Search className="w-5 h-5 text-[color:var(--fg-muted)]" />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                  className="flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-[color:var(--fg-muted)]"
                />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close search"
                  className="p-1.5 rounded-md text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {query.trim().length < 2 ? (
                  <p className="px-4 py-8 text-center text-sm text-[color:var(--fg-muted)]">
                    Type at least 2 characters to search the catalog.
                  </p>
                ) : results.length === 0 && !loading ? (
                  <p className="px-4 py-8 text-center text-sm text-[color:var(--fg-muted)]">
                    No products match “{query.trim()}”.
                  </p>
                ) : (
                  <ul className="py-2">
                    {results.map((p) => {
                      const price = typeof p.price === 'string' ? parseFloat(p.price) : p.price;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pick(p.slug)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[color:var(--bg-soft)] transition-colors"
                          >
                            <span className="relative w-10 h-12 rounded-md overflow-hidden bg-[color:var(--bg-soft)] shrink-0">
                              {p.images?.[0]?.url && (
                                <Image
                                  src={p.images[0].url}
                                  alt={p.images[0].alt ?? p.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              )}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium line-clamp-1">{p.name}</span>
                              <span className="block text-xs text-[color:var(--fg-muted)]">
                                {p.brand?.name ?? p.category.name}
                              </span>
                            </span>
                            <span className="text-sm font-semibold shrink-0">
                              {formatPrice(price, p.currency)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 border-t border-[color:var(--border)] text-[11px] text-[color:var(--fg-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CornerDownLeft className="w-3 h-3" /> See all results
                </span>
                <span>Esc to close</span>
              </div>
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
