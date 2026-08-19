import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ProductSummary } from '@drikon/shared-types';

export const MAX_COMPARE = 4;

type ToggleResult = 'added' | 'removed' | 'full';

interface CompareState {
  items: ProductSummary[];
  toggle: (p: ProductSummary) => ToggleResult;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle(product) {
        const { items } = get();
        if (items.some((i) => i.id === product.id)) {
          set({ items: items.filter((i) => i.id !== product.id) });
          return 'removed';
        }
        if (items.length >= MAX_COMPARE) return 'full';
        set({ items: [...items, product] });
        return 'added';
      },
      remove(id) {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
      clear() {
        set({ items: [] });
      },
    }),
    {
      name: 'drikon-compare',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (undefined as unknown as StateStorage),
      ),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
