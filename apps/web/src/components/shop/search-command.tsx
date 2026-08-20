'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X, Loader2, CornerDownLeft, Mic, MicOff, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ProductListResponse, ProductSummary } from '@drikon/shared-types';
import { apiGet } from '@/lib/api-client';
import { cn, formatPrice } from '@/lib/utils';
import { parseVoiceCommand } from '@/lib/voice-command';
import { useCartStore } from '@/store/cart-store';

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'Microphone is blocked for this site. Click the icon left of the address bar → Site settings → Microphone → Allow, then reload the page.',
  'service-not-allowed':
    "Chrome's speech-recognition service is unavailable — this isn't a microphone permission issue. It commonly happens on Chromium builds without Google API keys (e.g. Linux distro packages installed via apt/snap rather than Google's own .deb), or under an enterprise/managed-browser policy that disables it. Try Chrome installed directly from google.com, or a different device.",
  'no-speech': "Didn't catch that — try again.",
  'audio-capture': 'No microphone found.',
  network: 'Voice search needs an internet connection.',
};

export function SearchCommand() {
  const router = useRouter();
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [voiceConfirm, setVoiceConfirm] = useState<{ quantity: number; product: ProductSummary } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const cartAdd = useCartStore((s) => s.add);

  useEffect(() => setMounted(true), []);

  // Feature-detect the Web Speech API (Chrome/Safari only, prefixed).
  useEffect(() => {
    setSpeechSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Surface an already-blocked mic permission up front, so the button shows
  // a "blocked" state instead of only failing after the user clicks it.
  // Not all browsers support querying 'microphone' (e.g. Safari) — fails
  // silently there and the button just behaves as it did before.
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let status: PermissionStatus | undefined;
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((result) => {
        status = result;
        setMicBlocked(result.state === 'denied');
        result.onchange = () => setMicBlocked(result.state === 'denied');
      })
      .catch(() => {
        // Permission name unsupported — leave micBlocked false, normal flow applies.
      });
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  // Stop any in-flight recognition on unmount so it doesn't keep the mic open.
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

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
    setVoiceConfirm(null);
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

  // A voice command like "2 phone case" resolves quantity + item text, then
  // looks up the best-matching product so the user can confirm-and-add
  // in one step instead of retyping what they just said.
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    const { quantity, itemText } = parseVoiceCommand(transcript);
    if (!itemText) {
      setQuery(transcript);
      return;
    }
    setQuery(itemText); // shows the normal live-search list immediately as feedback
    try {
      const data = await apiGet<ProductListResponse>(
        `/api/v1/products?search=${encodeURIComponent(itemText)}&limit=1`,
      );
      if (data.items[0]) setVoiceConfirm({ quantity, product: data.items[0] });
    } catch {
      // No match / request failed — the normal search results already showing is fine.
    }
  }, []);

  const confirmAddToCart = useCallback(() => {
    if (!voiceConfirm) return;
    const { quantity, product } = voiceConfirm;
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    cartAdd(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0]?.url,
        unitPrice: price,
        currency: product.currency,
      },
      quantity,
    );
    toast.success(t('addedToCartToast', { quantity, product: product.name }));
    close();
  }, [voiceConfirm, cartAdd, close, t]);

  const searchInstead = useCallback(() => setVoiceConfirm(null), []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    setVoiceConfirm(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.item(0)?.transcript;
      if (transcript) void handleVoiceTranscript(transcript);
    };
    recognition.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') setMicBlocked(true);
      const message = SPEECH_ERROR_MESSAGES[e.error] ?? 'Voice search failed. Please try again.';
      const longMessage = e.error === 'not-allowed' || e.error === 'service-not-allowed';
      toast.error(message, { duration: longMessage ? 10000 : 4000 });
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [handleVoiceTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const handleMicClick = useCallback(() => {
    if (micBlocked) {
      toast.error(SPEECH_ERROR_MESSAGES['not-allowed'], { duration: 10000 });
      return;
    }
    if (listening) stopListening();
    else startListening();
  }, [micBlocked, listening, startListening, stopListening]);

  return (
    <>
      <button
        type="button"
        aria-label={t('searchLabel')}
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
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVoiceConfirm(null);
                  }}
                  placeholder={t('searchPlaceholder')}
                  className="flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-[color:var(--fg-muted)]"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleMicClick}
                    aria-label={micBlocked ? t('micBlocked') : listening ? t('stopVoiceSearch') : t('searchByVoice')}
                    aria-pressed={listening}
                    title={micBlocked ? t('micBlocked') : undefined}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      micBlocked
                        ? 'text-red-500 hover:bg-red-500/10'
                        : listening
                          ? 'text-[color:var(--accent)] bg-[color:var(--bg-soft)] animate-pulse'
                          : 'text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)]',
                    )}
                  >
                    {micBlocked ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label={t('closeSearch')}
                  className="p-1.5 rounded-md text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-soft)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                {voiceConfirm ? (
                  <div className="px-4 py-6">
                    <p className="text-xs text-[color:var(--fg-muted)] mb-3">{t('didYouMean')}</p>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-[color:var(--border)] mb-4">
                      <span className="relative w-12 h-14 rounded-md overflow-hidden bg-[color:var(--bg-soft)] shrink-0">
                        {voiceConfirm.product.images?.[0]?.url && (
                          <Image
                            src={voiceConfirm.product.images[0].url}
                            alt={voiceConfirm.product.images[0].alt ?? voiceConfirm.product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-2">
                          {voiceConfirm.quantity} × {voiceConfirm.product.name}
                        </div>
                        <div className="text-xs text-[color:var(--fg-muted)] mt-0.5">
                          {formatPrice(
                            typeof voiceConfirm.product.price === 'string'
                              ? parseFloat(voiceConfirm.product.price)
                              : voiceConfirm.product.price,
                            voiceConfirm.product.currency,
                          )}{' '}
                          {t('each')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={confirmAddToCart} className="btn-primary flex-1 justify-center">
                        <ShoppingCart className="w-4 h-4" /> {t('addToCart')}
                      </button>
                      <button type="button" onClick={searchInstead} className="btn-ghost flex-1 justify-center">
                        {t('searchInstead')}
                      </button>
                    </div>
                  </div>
                ) : query.trim().length < 2 ? (
                  <p className="px-4 py-8 text-center text-sm text-[color:var(--fg-muted)]">
                    {t('typeAtLeastTwoChars')}
                  </p>
                ) : results.length === 0 && !loading ? (
                  <p className="px-4 py-8 text-center text-sm text-[color:var(--fg-muted)]">
                    {t('noProductsMatch', { query: query.trim() })}
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
                  <CornerDownLeft className="w-3 h-3" /> {t('seeAllResults')}
                </span>
                <span>{t('escToClose')}</span>
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
