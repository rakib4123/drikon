'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Package, Plus, ArrowRight } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { ProductListResponse } from '@drikon/shared-types';

export default function AdminHomePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<{ total: number; lowStock: number } | null>(null);

  useEffect(() => {
    void apiGet<ProductListResponse>('/api/v1/products?limit=60')
      .then((data) => {
        const lowStock = data.items.filter((p: any) => p.stock <= (p.lowStockThreshold ?? 5)).length;
        setStats({ total: data.pagination.total, lowStock });
      })
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="px-8 py-12 max-w-5xl">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        Welcome back
      </div>
      <h1 className="display text-4xl mb-1">Hi, {user?.name?.split(' ')[0]} 👋</h1>
      <p className="text-[color:var(--fg-muted)] mb-10">Here's what's happening with Drikon.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        <StatCard label="Total products" value={stats?.total ?? '—'} />
        <StatCard label="Low stock alerts" value={stats?.lowStock ?? '—'} accent={(stats?.lowStock ?? 0) > 0} />
        <StatCard label="Active admins" value={1} />
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1 text-[color:var(--accent)]">
              <Package className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-[0.2em]">Products</span>
            </div>
            <h3 className="display text-xl">Manage your catalog</h3>
            <p className="text-sm text-[color:var(--fg-muted)] mt-1 max-w-md">
              Create, edit, and remove products. Upload images directly from your computer.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Link href="/admin/products" className="btn-ghost">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New product
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`card ${accent ? 'border-red-500/40' : ''}`}>
      <div className="text-xs text-[color:var(--fg-muted)] mb-1.5">{label}</div>
      <div className={`display text-3xl ${accent ? 'text-red-400' : ''}`}>{value}</div>
    </div>
  );
}
