'use client';

import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiGet, ApiError } from '@/lib/api-client';
import { ProductForm } from '@/components/admin/product-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminProductEditPage({ params }: PageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<any>(`/api/v1/products/${id}`)
      .then(setProduct)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load product');
      });
  }, [id]);

  if (error) {
    return (
      <div className="px-4 sm:px-8 py-8 sm:py-12">
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] mb-6">
          <ArrowLeft className="w-4 h-4" /> All products
        </Link>
        <div className="card text-red-600">{error}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 sm:px-8 py-8 sm:py-12">
        <Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] mb-6">
        <ArrowLeft className="w-4 h-4" /> All products
      </Link>
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[color:var(--accent)] mb-2">
        Edit product
      </div>
      <h1 className="display text-4xl mb-8">{product.name}</h1>

      <ProductForm
        mode="edit"
        productId={id}
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription ?? '',
          sku: product.sku,
          price: String(product.price),
          compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
          currency: product.currency,
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          categoryId: product.categoryId,
          brandId: product.brandId ?? '',
        }}
      />
    </div>
  );
}
