'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from '@/components/ui/smart-image';
import { useLocale, useTranslations } from 'next-intl';
import { Search, Loader2, Mic, ArrowRight } from 'lucide-react';
import { useProductSearch, openSearchPalette, MIN_SEARCH_CHARS } from '@/lib/use-product-search';
import { effectivePrice, formatPrice } from '@/lib/utils';
import { localize } from '@/lib/localize';
import type { Locale } from '@/i18n/request';

/**
 * The megastore header search: a real input that suggests products as you type.
 *
 * It is a plain `<form>` first — with JavaScript off, or before hydration, Enter
 * still submits to the results page. The suggestion list follows the ARIA
 * combobox pattern: focus stays in the input while ↑/↓ move
 * `aria-activedescendant`, so a screen reader announces each suggestion.
 */
export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations('search');
  const locale = useLocale() as Locale;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const { results, loading } = useProductSearch(query);
  const rootRef = useRef<HTMLFormElement>(null);
  const listId = useId();

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Close when focus or a click lands anywhere outside the search.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  // A new result set invalidates the highlighted row.
  useEffect(() => setActive(-1), [results]);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= MIN_SEARCH_CHARS;
  // Row after the products is "see all results"; it counts as an option too.
  const optionCount = results.length + 1;

  const goToResults = () => {
    if (!trimmed) return;
    setOpen(false);
    router.push(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const goToProduct = (slug: string) => {
    setOpen(false);
    setQuery('');
    router.push(`/products/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && active >= 0 && active < results.length) {
      // Enter on a highlighted product opens it; otherwise the form submits.
      e.preventDefault();
      goToProduct(results[active].slug);
    }
  };

  return (
    <form
      ref={rootRef}
      role="search"
      action="/products"
      onSubmit={(e) => {
        e.preventDefault();
        goToResults();
      }}
      className="relative w-full"
    >
      <div className="flex h-11 items-center gap-1 rounded-full bg-[color:var(--bg-soft)] pl-4 pr-1.5">
        <input
          name="search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={t('searchLabel')}
          className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-[color:var(--fg-muted)]
                     [&::-webkit-search-cancel-button]:hidden"
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={() => openSearchPalette({ voice: true })}
            aria-label={t('searchByVoice')}
            className="p-2 rounded-full text-[color:var(--fg-muted)] hover:text-[color:var(--accent-2)] transition-colors"
          >
            <Mic className="w-[18px] h-[18px]" />
          </button>
        )}
        <button
          type="submit"
          aria-label={t('searchLabel')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--accent)] text-[color:var(--accent-fg)] hover:brightness-110 transition-[filter]"
        >
          {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Search className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label={t('searchLabel')}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[var(--radius-card)] border border-[color:var(--border)]
                     bg-[color:var(--surface-solid)] shadow-[0_18px_40px_-16px_rgba(28,25,23,0.3)] overflow-hidden animate-dk-pop-in"
        >
          {results.length === 0 ? (
            <div role="status" className="px-4 py-5 text-sm text-[color:var(--fg-muted)]">
              {loading ? t('searching') : t('noProductsMatch', { query: trimmed })}
            </div>
          ) : (
            <ul className="py-1.5 max-h-[60vh] overflow-y-auto">
              {results.map((p, i) => {
                const name = localize(p.name, p.nameBn, locale);
                const { price, listPrice, onSale } = effectivePrice(p);
                return (
                  <li
                    key={p.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={active === i}
                    onPointerEnter={() => setActive(i)}
                    // pointerdown, not click: fires before the input's blur
                    // would otherwise tear the list down.
                    onPointerDown={(e) => {
                      e.preventDefault();
                      goToProduct(p.slug);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${active === i ? 'bg-[color:var(--bg-soft)]' : ''}`}
                  >
                    <span className="relative w-11 h-11 rounded-md overflow-hidden bg-[color:var(--bg-soft)] shrink-0 border border-[color:var(--border)]">
                      {p.images?.[0]?.url && (
                        <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold line-clamp-1">{name}</span>
                      <span className="block text-xs text-[color:var(--fg-muted)]">{p.brand?.name ?? p.category.name}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block text-sm price-now ${onSale ? 'is-sale' : ''}`}>{formatPrice(price, p.currency)}</span>
                      {onSale && <span className="block text-[11px] price-was">{formatPrice(listPrice, p.currency)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div
            id={`${listId}-${results.length}`}
            role="option"
            aria-selected={active === results.length}
            onPointerEnter={() => setActive(results.length)}
            onPointerDown={(e) => {
              e.preventDefault();
              goToResults();
            }}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[color:var(--border)] text-sm font-semibold
                        text-[color:var(--accent)] cursor-pointer ${active === results.length ? 'bg-[color:var(--bg-soft)]' : ''}`}
          >
            {t('seeAllResultsFor', { query: trimmed })}
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}
    </form>
  );
}
