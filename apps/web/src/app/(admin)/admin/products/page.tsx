'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { apiGet, apiDelete, ApiError } from '@/lib/api-client';
import type { ProductListResponse, ProductSummary } from '@drikon/shared-types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await apiGet<ProductListResponse>('/api/v1/products?limit=60');
      setProducts(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load products');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiDelete(`/api/v1/products/${id}`);
      setProducts((curr) => (curr ? curr.filter((p) => p.id !== id) : curr));
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12">
      <div className="flex items-end justify-between mb-8 max-w-6xl">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
            Catalog
          </div>
          <h1 className="display text-4xl">Products</h1>
          {products && <p className="text-sm text-[color:var(--fg-muted)] mt-2">{products.length} products</p>}
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New product
        </Link>
      </div>

      {error && (
        <div className="card text-red-600 text-sm mb-6 max-w-6xl">{error}</div>
      )}

      {!products ? (
        <div className="card text-[color:var(--fg-muted)] max-w-6xl">
          <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />Loading…
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16 max-w-6xl text-[color:var(--fg-muted)]">
          No products yet. <Link href="/admin/products/new" className="text-[color:var(--accent)] hover:underline">Create your first one</Link>.
        </div>
      ) : (
        <div className="card overflow-x-auto max-w-6xl p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[color:var(--border)] text-xs uppercase tracking-wider text-[color:var(--fg-muted)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-soft)]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images[0]?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt={p.name} className="w-10 h-10 rounded-md object-cover border border-[color:var(--border)]" />
                      )}
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-[color:var(--fg-muted)]">{p.category.name}{p.brand ? ` · ${p.brand.name}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{(p as any).sku ?? '—'}</td>
                  <td className="px-4 py-3">{p.currency} {Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {p.stock > 0 ? (
                      <span className={p.stock <= 5 ? 'text-amber-600' : ''}>{p.stock}</span>
                    ) : (
                      <span className="text-red-600">Out</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.isFeatured && <Badge>Featured</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmId === p.id ? (
                      <div className="flex gap-2 justify-end items-center">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="px-2 py-1 text-xs rounded bg-red-500/15 border border-red-500/40 text-red-600 hover:bg-red-500/25"
                        >
                          {deletingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 text-xs rounded border border-[color:var(--border)] hover:bg-[color:var(--bg-soft)]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="p-2 rounded-md hover:bg-[color:var(--bg-soft)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setConfirmId(p.id)}
                          className="p-2 rounded-md hover:bg-red-500/10 text-[color:var(--fg-muted)] hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:var(--accent)]/15 text-[color:var(--accent)]">{children}</span>;
}
