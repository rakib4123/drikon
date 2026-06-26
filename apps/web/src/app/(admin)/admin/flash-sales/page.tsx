'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import type { ProductSummary, ProductListResponse } from '@drikon/shared-types';

interface SaleProduct {
  productId: string;
  salePrice: string | number;
  soldCount: number;
  product: { id: string; name: string; slug: string; price: string | number; currency: string };
}
interface FlashSale {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  products: SaleProduct[];
}

const dtLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminFlashSalesPage() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', startsAt: '', endsAt: '' });

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        apiGet<FlashSale[]>('/api/v1/flash-sales'),
        apiGet<ProductListResponse>('/api/v1/products?limit=60'),
      ]);
      setSales(s);
      setProducts(p.items);
    } catch {
      toast.error('Failed to load flash sales');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return toast.error('All fields required');
    setCreating(true);
    try {
      await apiPost('/api/v1/flash-sales', {
        name: form.name.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success('Flash sale created');
      setForm({ name: '', startsAt: '', endsAt: '' });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (s: FlashSale) => {
    setSales((xs) => xs.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await apiPatch(`/api/v1/flash-sales/${s.id}`, { isActive: !s.isActive });
    } catch {
      setSales((xs) => xs.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
      toast.error('Could not update');
    }
  };

  const removeSale = async (s: FlashSale) => {
    if (!confirm(`Delete flash sale "${s.name}"?`)) return;
    try {
      await apiDelete(`/api/v1/flash-sales/${s.id}`);
      toast.success('Deleted');
      await load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Flash sales</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Time-boxed deals shown on the storefront while live.</p>

      <form onSubmit={create} className="card grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end mb-8">
        <label className="block">
          <span className="block text-xs text-[color:var(--fg-muted)] mb-1">Name</span>
          <input className="input" placeholder="Midnight Madness" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-xs text-[color:var(--fg-muted)] mb-1">Starts</span>
          <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-xs text-[color:var(--fg-muted)] mb-1">Ends</span>
          <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </label>
        <button type="submit" disabled={creating} className="btn-primary">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create</>}
        </button>
      </form>

      {loading ? (
        <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
      ) : sales.length === 0 ? (
        <div className="card text-center py-16 text-sm text-[color:var(--fg-muted)]">No flash sales yet.</div>
      ) : (
        <div className="space-y-5">
          {sales.map((s) => (
            <SaleCard key={s.id} sale={s} products={products} onToggle={() => toggleActive(s)} onDelete={() => removeSale(s)} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function SaleCard({
  sale,
  products,
  onToggle,
  onDelete,
  onChanged,
}: {
  sale: FlashSale;
  products: ProductSummary[];
  onToggle: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [pid, setPid] = useState('');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const now = Date.now();
  const live = sale.isActive && new Date(sale.startsAt).getTime() <= now && new Date(sale.endsAt).getTime() >= now;
  const inSale = new Set(sale.products.map((p) => p.productId));
  const available = products.filter((p) => !inSale.has(p.id));

  const addProduct = async () => {
    if (!pid || !price) return toast.error('Pick a product and sale price');
    setAdding(true);
    try {
      await apiPost(`/api/v1/flash-sales/${sale.id}/products`, { productId: pid, salePrice: Number(price) });
      toast.success('Product added');
      setPid('');
      setPrice('');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Add failed');
    } finally {
      setAdding(false);
    }
  };

  const removeProduct = async (productId: string) => {
    try {
      await apiDelete(`/api/v1/flash-sales/${sale.id}/products/${productId}`);
      onChanged();
    } catch {
      toast.error('Remove failed');
    }
  };

  const [dates, setDates] = useState({ startsAt: dtLocal(sale.startsAt), endsAt: dtLocal(sale.endsAt) });
  const [savingDates, setSavingDates] = useState(false);
  const saveDates = async () => {
    if (!dates.startsAt || !dates.endsAt) return toast.error('Both dates are required');
    setSavingDates(true);
    try {
      await apiPatch(`/api/v1/flash-sales/${sale.id}`, {
        startsAt: new Date(dates.startsAt).toISOString(),
        endsAt: new Date(dates.endsAt).toISOString(),
      });
      toast.success('Schedule updated');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setSavingDates(false);
    }
  };

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--border)]">
        <Zap className={`w-4 h-4 ${live ? 'text-[color:var(--accent)]' : 'text-[color:var(--fg-muted)]'}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {sale.name}
            {live && <span className="text-[10px] font-bold text-[color:var(--accent)] border border-[color:var(--accent)]/40 rounded px-1.5">LIVE</span>}
          </div>
          <div className="text-xs text-[color:var(--fg-muted)]">
            {new Date(sale.startsAt).toLocaleString()} → {new Date(sale.endsAt).toLocaleString()}
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[color:var(--fg-muted)]">
          <input type="checkbox" checked={sale.isActive} onChange={onToggle} /> Active
        </label>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-[color:var(--fg-muted)] hover:text-red-600" aria-label="Delete sale">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 py-4">
        {/* Reschedule */}
        <div className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-[color:var(--border)]">
          <label className="text-xs text-[color:var(--fg-muted)]">
            Starts
            <input className="input text-sm mt-1" type="datetime-local" value={dates.startsAt} onChange={(e) => setDates({ ...dates, startsAt: e.target.value })} />
          </label>
          <label className="text-xs text-[color:var(--fg-muted)]">
            Ends
            <input className="input text-sm mt-1" type="datetime-local" value={dates.endsAt} onChange={(e) => setDates({ ...dates, endsAt: e.target.value })} />
          </label>
          <button onClick={saveDates} disabled={savingDates} className="btn-ghost !px-4 text-sm">
            {savingDates ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save dates'}
          </button>
        </div>

        {sale.products.length === 0 ? (
          <p className="text-sm text-[color:var(--fg-muted)] mb-3">No products in this sale yet.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {sale.products.map((p) => (
              <li key={p.productId} className="flex items-center gap-3 text-sm">
                <span className="flex-1 min-w-0 line-clamp-1">{p.product.name}</span>
                <span className="text-[color:var(--fg-muted)] line-through text-xs">{formatPrice(p.product.price, p.product.currency)}</span>
                <span className="font-semibold text-[color:var(--accent)]">{formatPrice(p.salePrice, p.product.currency)}</span>
                <button onClick={() => removeProduct(p.productId)} className="p-1 rounded text-[color:var(--fg-muted)] hover:text-red-600" aria-label="Remove">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <select className="input w-auto flex-1 min-w-[180px] text-sm" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Add a product…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input className="input w-32 text-sm" type="number" placeholder="Sale price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button onClick={addProduct} disabled={adding} className="btn-ghost !px-4 text-sm">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
