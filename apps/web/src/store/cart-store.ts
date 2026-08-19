import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  image?: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  /** Coupon code applied in the cart; carries through to checkout. */
  couponCode: string | null;
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  remove: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  subtotal: () => number;
}

const sameItem = (a: CartItem, b: { productId: string; variantId?: string }) =>
  a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,

      setCoupon(code) { set({ couponCode: code }); },

      add(item, qty = 1) {
        set((state) => {
          const existing = state.items.find((i) => sameItem(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameItem(i, item) ? { ...i, quantity: i.quantity + qty } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        });
      },

      remove(productId, variantId) {
        set((state) => ({
          items: state.items.filter((i) => !sameItem(i, { productId, variantId })),
        }));
      },

      updateQty(productId, qty, variantId) {
        set((state) => ({
          items: state.items.map((i) =>
            sameItem(i, { productId, variantId }) ? { ...i, quantity: Math.max(1, qty) } : i,
          ),
        }));
      },

      clear() { set({ items: [], couponCode: null }); },

      subtotal() {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      },
    }),
    {
      name: 'drikon-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (undefined as unknown as StateStorage),
      ),
      // Persist the cart items + applied coupon
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode }),
    },
  ),
);
