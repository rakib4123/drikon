'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { products: number };
}

type Draft = { name: string; slug: string; logoUrl: string };
const EMPTY: Draft = { name: '', slug: '', logoUrl: '' };

export default function AdminBrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await apiGet<Brand[]>('/api/v1/brands'));
    } catch {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (b: Brand) => {
    setEditingId(b.id);
    setDraft({ name: b.name, slug: b.slug, logoUrl: b.logoUrl ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return toast.error('Name is required');
    setSaving(true);
    const body = { name: draft.name.trim(), slug: draft.slug.trim() || undefined, logoUrl: draft.logoUrl.trim() };
    try {
      if (editingId) {
        await apiPatch(`/api/v1/brands/${editingId}`, body);
        toast.success('Brand updated');
      } else {
        await apiPost('/api/v1/brands', body);
        toast.success('Brand created');
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Brand) => {
    if (!confirm(`Delete "${b.name}"?`)) return;
    try {
      await apiDelete(`/api/v1/brands/${b.id}`);
      toast.success('Brand deleted');
      if (editingId === b.id) reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-8 py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Brands</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Manage the labels you stock.</p>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        <form onSubmit={save} className="card space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Edit brand' : 'New brand'}</h2>
            {editingId && (
              <button type="button" onClick={reset} className="text-xs text-[color:var(--fg-muted)] inline-flex items-center gap-1 hover:text-[color:var(--fg)]">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>
          <input className="input" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input font-mono text-xs" placeholder="slug (optional)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          <input className="input text-xs" placeholder="Logo URL (optional)" value={draft.logoUrl} onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })} />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> {editingId ? 'Save changes' : 'Add brand'}</>}
          </button>
        </form>

        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No brands yet.</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {items.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-[color:var(--fg-muted)] font-mono">/{b.slug} · {b._count.products} products</div>
                  </div>
                  <button onClick={() => startEdit(b)} className="p-2 rounded-lg hover:bg-[color:var(--bg)] text-[color:var(--fg-muted)] hover:text-[color:var(--accent)]" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(b)} className="p-2 rounded-lg hover:bg-red-500/10 text-[color:var(--fg-muted)] hover:text-red-600" aria-label="Delete">
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
