'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { CloudinaryUploader } from '@/components/admin/cloudinary-uploader';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  _count: { products: number };
}

type Draft = { name: string; slug: string; description: string; imageUrl: string; parentId: string };
const EMPTY: Draft = { name: '', slug: '', description: '', imageUrl: '', parentId: '' };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await apiGet<Category[]>('/api/v1/categories'));
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setDraft({ name: c.name, slug: c.slug, description: c.description ?? '', imageUrl: c.imageUrl ?? '', parentId: c.parentId ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return toast.error('Name is required');
    const img = draft.imageUrl.trim();
    if (img && !/^https?:\/\//i.test(img)) {
      return toast.error('Image must be a full URL (https://…) — or use Upload above');
    }
    setSaving(true);
    const body = {
      name: draft.name.trim(),
      slug: draft.slug.trim() || undefined,
      description: draft.description.trim(),
      imageUrl: draft.imageUrl.trim(),
      parentId: draft.parentId,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/v1/categories/${editingId}`, body);
        toast.success('Category updated');
      } else {
        await apiPost('/api/v1/categories', body);
        toast.success('Category created');
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await apiDelete(`/api/v1/categories/${c.id}`);
      toast.success('Category deleted');
      if (editingId === c.id) reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Categories</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">Organise your catalog into sections.</p>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Form */}
        <form onSubmit={save} className="card space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Edit category' : 'New category'}</h2>
            {editingId && (
              <button type="button" onClick={reset} className="text-xs text-[color:var(--fg-muted)] inline-flex items-center gap-1 hover:text-[color:var(--fg)]">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>
          <input className="input" aria-label="Category name" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input font-mono text-xs" aria-label="Category slug" placeholder="slug (optional)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
          <select className="input" aria-label="Parent category" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}>
            <option value="">No parent (top level)</option>
            {items
              .filter((c) => c.id !== editingId && !c.parentId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Under: {c.name}
                </option>
              ))}
          </select>
          <textarea className="input" aria-label="Category description" rows={2} placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <CloudinaryUploader
            label="Category image (optional)"
            value={draft.imageUrl || null}
            onChange={(url) => setDraft({ ...draft, imageUrl: url ?? '' })}
          />
          <input className="input text-xs" aria-label="Category image URL" placeholder="…or paste image URL" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> {editingId ? 'Save changes' : 'Add category'}</>}
          </button>
        </form>

        {/* List */}
        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-[color:var(--fg-muted)]">No categories yet.</div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-[color:var(--fg-muted)] font-mono">/{c.slug} · {c._count.products} products</div>
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
