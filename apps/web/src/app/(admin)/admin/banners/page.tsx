'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { CloudinaryUploader } from '@/components/admin/cloudinary-uploader';

interface Banner {
  id: string;
  heading: string;
  subheading: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  position: number;
  isActive: boolean;
}

type Draft = {
  heading: string;
  subheading: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  position: string;
  isActive: boolean;
};
const EMPTY: Draft = {
  heading: '',
  subheading: '',
  imageUrl: '',
  ctaLabel: 'Shop now',
  ctaHref: '/products',
  position: '0',
  isActive: true,
};

export default function AdminBannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await apiGet<Banner[]>('/api/v1/banners'));
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = (b: Banner) => {
    setEditingId(b.id);
    setDraft({
      heading: b.heading,
      subheading: b.subheading ?? '',
      imageUrl: b.imageUrl ?? '',
      ctaLabel: b.ctaLabel ?? '',
      ctaHref: b.ctaHref ?? '',
      position: String(b.position),
      isActive: b.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.heading.trim()) return toast.error('Heading is required');
    const bg = draft.imageUrl.trim();
    if (bg && !/^https?:\/\//i.test(bg)) {
      return toast.error('Background image must be a full URL (https://…) — or use Upload');
    }
    setSaving(true);
    const body = {
      heading: draft.heading.trim(),
      subheading: draft.subheading.trim(),
      imageUrl: draft.imageUrl.trim(),
      ctaLabel: draft.ctaLabel.trim(),
      ctaHref: draft.ctaHref.trim(),
      position: Number(draft.position) || 0,
      isActive: draft.isActive,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/v1/banners/${editingId}`, body);
        toast.success('Banner updated');
      } else {
        await apiPost('/api/v1/banners', body);
        toast.success('Banner created');
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (b: Banner) => {
    setItems((xs) => xs.map((x) => (x.id === b.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await apiPatch(`/api/v1/banners/${b.id}`, { isActive: !b.isActive });
    } catch {
      setItems((xs) => xs.map((x) => (x.id === b.id ? { ...x, isActive: b.isActive } : x)));
      toast.error('Could not update');
    }
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Delete banner "${b.heading}"?`)) return;
    try {
      await apiDelete(`/api/v1/banners/${b.id}`);
      toast.success('Banner deleted');
      if (editingId === b.id) reset();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-5xl">
      <h1 className="display text-3xl mb-1">Hero banners</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">
        Slides for the home page hero. Lower position shows first; inactive slides are hidden.
      </p>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Form */}
        <form onSubmit={save} className="card space-y-3 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Edit banner' : 'New banner'}</h2>
            {editingId && (
              <button type="button" onClick={reset} className="text-xs text-[color:var(--fg-muted)] inline-flex items-center gap-1 hover:text-[color:var(--fg)]">
                <X className="w-3 h-3" /> Cancel
              </button>
            )}
          </div>

          <CloudinaryUploader
            label="Background image (optional)"
            value={draft.imageUrl || null}
            onChange={(url) => setDraft({ ...draft, imageUrl: url ?? '' })}
          />
          <input className="input text-xs" aria-label="Banner background image URL" placeholder="…or paste image URL" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />

          <input className="input" aria-label="Banner heading" placeholder="Heading" value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
          <textarea className="input" aria-label="Banner subheading" rows={2} placeholder="Subheading (optional)" value={draft.subheading} onChange={(e) => setDraft({ ...draft, subheading: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" aria-label="CTA button label" placeholder="CTA label" value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} />
            <input className="input text-xs" aria-label="CTA button link" placeholder="CTA link (/products)" value={draft.ctaHref} onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[color:var(--fg-muted)] flex items-center gap-1.5">
              Position
              <input className="input !w-16 !py-1.5" type="number" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm ml-auto">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              Active
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> {editingId ? 'Save changes' : 'Add banner'}</>}
          </button>
        </form>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="card py-16 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" /></div>
          ) : items.length === 0 ? (
            <div className="card py-16 text-center text-sm text-[color:var(--fg-muted)]">No banners yet — add one to power the hero slider.</div>
          ) : (
            items.map((b) => (
              <div key={b.id} className={`card !p-0 overflow-hidden flex ${b.isActive ? '' : 'opacity-60'}`}>
                <div className="relative w-32 shrink-0 bg-[#14233f]">
                  {b.imageUrl ? (
                    <Image src={b.imageUrl} alt="" fill sizes="128px" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-drikon-gradient" />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold line-clamp-1">{b.heading}</div>
                    {b.subheading && <div className="text-xs text-[color:var(--fg-muted)] line-clamp-1">{b.subheading}</div>}
                    <div className="text-[11px] text-[color:var(--fg-muted)] mt-1">
                      pos {b.position}{b.ctaLabel ? ` · ${b.ctaLabel} → ${b.ctaHref}` : ''}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-[color:var(--fg-muted)] shrink-0">
                    <input type="checkbox" checked={b.isActive} onChange={() => toggle(b)} /> Active
                  </label>
                  <button onClick={() => startEdit(b)} className="p-2 rounded-lg hover:bg-[color:var(--bg)] text-[color:var(--fg-muted)] hover:text-[color:var(--accent)] shrink-0" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(b)} className="p-2 rounded-lg hover:bg-red-500/10 text-[color:var(--fg-muted)] hover:text-red-600 shrink-0" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
