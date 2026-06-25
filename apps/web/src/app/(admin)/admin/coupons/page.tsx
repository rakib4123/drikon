'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X, Percent, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';

interface Cat { id: string; name: string; slug: string }
interface Coupon {
  id: string;
  code: string;
  description: string | null;
  isPercentage: boolean;
  value: string | number;
  minOrderAmount: string | number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  freeShipping: boolean;
  isPublic: boolean;
  categoryId: string | null;
  category?: { name: string } | null;
}

type Draft = {
  code: string;
  isPercentage: boolean;
  value: string;
  minOrderAmount: string;
  maxRedemptions: string;
  expiresAt: string;
  isActive: boolean;
  freeShipping: boolean;
  isPublic: boolean;
  categoryId: string;
};
const EMPTY: Draft = { code: '', isPercentage: true, value: '', minOrderAmount: '', maxRedemptions: '', expiresAt: '', isActive: true, freeShipping: false, isPublic: false, categoryId: '' };

export default function AdminCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, cat] = await Promise.all([
        apiGet<Coupon[]>('/api/v1/coupons'),
        apiGet<Cat[]>('/api/v1/categories').catch(() => []),
      ]);
      setItems(c);
      setCats(cat);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (c: Coupon) => {
    setEditingId(c.id);
    setDraft({
      code: c.code,
      isPercentage: c.isPercentage,
      value: String(c.value),
      minOrderAmount: c.minOrderAmount != null ? String(c.minOrderAmount) : '',
      maxRedemptions: c.maxRedemptions != null ? String(c.maxRedemptions) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
      freeShipping: c.freeShipping,
      isPublic: c.isPublic,
      categoryId: c.categoryId ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim()) return toast.error('Code is required');
    if (!draft.value && !draft.freeShipping) return toast.error('Enter a value or enable free shipping');
    setSaving(true);
    const body: Record<string, unknown> = {
      code: draft.code.trim(),
      isPercentage: draft.isPercentage,
      value: Number(draft.value || 0),
      isActive: draft.isActive,
      freeShipping: draft.freeShipping,
      isPublic: draft.isPublic,
      categoryId: draft.categoryId,
    };
    if (draft.minOrderAmount) body.minOrderAmount = Number(draft.minOrderAmount);
    if (draft.maxRedemptions) body.maxRedemptions = Number(draft.maxRedemptions);
    if (draft.expiresAt) body.expiresAt = new Date(draft.expiresAt).toISOString();
    try {
      if (editingId) {
        await apiPatch(`/api/v1/coupons/${editingId}`, body);
        toast.success('Coupon updated');
      } else {
        await apiPost('/api/v1/coupons', body);
        toast.success('Coupon created');
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await apiDelete(`/api/v1/coupons/${c.id}`);
      toast.success('Coupon deleted');
      if (editingId === c.id) reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Coupons</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Create discount codes customers apply at checkout.</p>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        <form onSubmit={save} className="card space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Edit coupon' : 'New coupon'}</h2>
            {editingId && (
              <button type="button" onClick={reset} className="text-xs text-[color:var(--fg-muted)] inline-flex items-center gap-1 hover:text-[color:var(--fg)]">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>
          <input className="input font-mono uppercase" placeholder="CODE" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />

          <div className="flex rounded-xl border border-[color:var(--border)] overflow-hidden text-sm">
            <button type="button" onClick={() => setDraft({ ...draft, isPercentage: true })}
              className={`flex-1 py-2 inline-flex items-center justify-center gap-1 ${draft.isPercentage ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]' : 'text-[color:var(--fg-muted)]'}`}>
              <Percent className="w-3.5 h-3.5" /> Percent
            </button>
            <button type="button" onClick={() => setDraft({ ...draft, isPercentage: false })}
              className={`flex-1 py-2 inline-flex items-center justify-center gap-1 ${!draft.isPercentage ? 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]' : 'text-[color:var(--fg-muted)]'}`}>
              <DollarSign className="w-3.5 h-3.5" /> Fixed
            </button>
          </div>

          <input className="input" type="number" placeholder={draft.isPercentage ? 'Discount % (e.g. 20)' : 'Amount off (e.g. 500)'} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
          <input className="input" type="number" placeholder="Min order amount (optional)" value={draft.minOrderAmount} onChange={(e) => setDraft({ ...draft, minOrderAmount: e.target.value })} />
          <input className="input" type="number" placeholder="Max redemptions (optional)" value={draft.maxRedemptions} onChange={(e) => setDraft({ ...draft, maxRedemptions: e.target.value })} />
          <label className="block text-xs text-[color:var(--fg-muted)]">
            Restrict to category (optional)
            <select className="input mt-1" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
              <option value="">Any product</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[color:var(--fg-muted)]">
            Expires
            <input className="input mt-1" type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.freeShipping} onChange={(e) => setDraft({ ...draft, freeShipping: e.target.checked })} />
              Also give free shipping
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} />
              Advertise as a public offer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> {editingId ? 'Save changes' : 'Add coupon'}</>}
          </button>
        </form>

        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No coupons yet.</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-semibold">{c.code}</span>
                      {!c.isActive && <span className="text-[10px] text-[color:var(--fg-muted)] border border-[color:var(--border)] rounded px-1.5">off</span>}
                      {c.freeShipping && <span className="text-[10px] text-emerald-600 border border-emerald-600/30 rounded px-1.5">free ship</span>}
                      {c.isPublic && <span className="text-[10px] text-[color:var(--accent)] border border-[color:var(--accent)]/30 rounded px-1.5">public</span>}
                      {c.category && <span className="text-[10px] text-[color:var(--fg-muted)] border border-[color:var(--border)] rounded px-1.5">{c.category.name}</span>}
                    </div>
                    <div className="text-xs text-[color:var(--fg-muted)]">
                      {Number(c.value) > 0 ? (c.isPercentage ? `${c.value}% off` : `${c.value} off`) : 'free shipping'}
                      {c.minOrderAmount ? ` · min ${c.minOrderAmount}` : ''}
                      {' · '}{c.redemptionCount}{c.maxRedemptions ? `/${c.maxRedemptions}` : ''} used
                    </div>
                  </div>
                  <button onClick={() => startEdit(c)} className="p-2 rounded-lg hover:bg-[color:var(--bg)] text-[color:var(--fg-muted)] hover:text-[color:var(--accent)]" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-500/10 text-[color:var(--fg-muted)] hover:text-red-600" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
