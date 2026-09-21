import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: string | number, currency = 'BDT'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * The price a shopper actually pays: the live flash-sale price when one is
 * running, otherwise the catalogue price.
 *
 * Everything that shows or charges a price should go through this, so a sale
 * can't be advertised in one place and ignored in another.
 */
export function effectivePrice(product: {
  price: string | number;
  salePrice?: string | number | null;
}): { price: number; listPrice: number; onSale: boolean; discountPercent: number } {
  const listPrice = toNumber(product.price);
  const sale = product.salePrice == null ? null : toNumber(product.salePrice);
  const onSale = sale !== null && sale < listPrice;
  const price = onSale ? (sale as number) : listPrice;
  return {
    price,
    listPrice,
    onSale,
    discountPercent: onSale ? Math.round(((listPrice - price) / listPrice) * 100) : 0,
  };
}

export function toNumber(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}
