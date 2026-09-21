import { describe, it, expect } from 'vitest';
import { effectivePrice } from './utils';

describe('effectivePrice', () => {
  it('uses the catalogue price when nothing is on sale', () => {
    expect(effectivePrice({ price: 1000 })).toEqual({
      price: 1000, listPrice: 1000, onSale: false, discountPercent: 0,
    });
  });

  it('prefers a live flash-sale price', () => {
    expect(effectivePrice({ price: 1000, salePrice: 750 })).toEqual({
      price: 750, listPrice: 1000, onSale: true, discountPercent: 25,
    });
  });

  it('ignores a sale price that is not actually cheaper', () => {
    const r = effectivePrice({ price: 1000, salePrice: 1200 });
    expect(r.price).toBe(1000);
    expect(r.onSale).toBe(false);
  });

  it('ignores a sale price equal to the catalogue price', () => {
    expect(effectivePrice({ price: 1000, salePrice: 1000 }).onSale).toBe(false);
  });

  it('parses the Decimal-as-string values Prisma serialises', () => {
    expect(effectivePrice({ price: '1000.00', salePrice: '750.00' })).toEqual({
      price: 750, listPrice: 1000, onSale: true, discountPercent: 25,
    });
  });

  it('treats a null sale price as no sale', () => {
    expect(effectivePrice({ price: 1000, salePrice: null }).onSale).toBe(false);
  });

  it('rounds the discount percentage to a whole number', () => {
    expect(effectivePrice({ price: 999, salePrice: 799 }).discountPercent).toBe(20);
  });
});
