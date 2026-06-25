'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '@/components/admin/product-form';

export default function AdminProductNewPage() {
  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] mb-6">
        <ArrowLeft className="w-4 h-4" /> All products
      </Link>
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        New product
      </div>
      <h1 className="display text-4xl mb-8">Add a product</h1>
      <ProductForm mode="create" />
    </div>
  );
}
