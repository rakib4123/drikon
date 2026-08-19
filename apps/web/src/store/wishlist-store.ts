import { create } from 'zustand';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

interface WishlistState {
  ids: string[];
  loaded: boolean;
  loading: boolean;
  /** Hydrate the set of wishlisted product IDs for the signed-in user. */
  fetch: () => Promise<void>;
  /** Optimistic add/remove. Returns the new wishlisted state, or null if it failed. */
  toggle: (productId: string) => Promise<boolean | null>;
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  loaded: false,
  loading: false,

  async fetch() {
    if (get().loaded || inFlight) return inFlight ?? undefined;
    set({ loading: true });
    inFlight = (async () => {
      try {
        const ids = await apiGet<string[]>('/api/v1/wishlist/ids');
        set({ ids, loaded: true, loading: false });
      } catch (err) {
        // 401 just means "not signed in" — leave it empty but mark loaded.
        if (err instanceof ApiError && err.status === 401) {
          set({ ids: [], loaded: true, loading: false });
        } else {
          set({ loading: false });
        }
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  async toggle(productId) {
    const wasWishlisted = get().ids.includes(productId);
    // Optimistic flip
    set((s) => ({
      ids: wasWishlisted ? s.ids.filter((id) => id !== productId) : [...s.ids, productId],
    }));
    try {
      if (wasWishlisted) {
        await apiDelete(`/api/v1/wishlist/${productId}`);
      } else {
        await apiPost(`/api/v1/wishlist/${productId}`);
      }
      return !wasWishlisted;
    } catch {
      // Revert on failure
      set((s) => ({
        ids: wasWishlisted ? [...s.ids, productId] : s.ids.filter((id) => id !== productId),
      }));
      return null;
    }
  },

  reset() {
    set({ ids: [], loaded: false, loading: false });
  },
}));
