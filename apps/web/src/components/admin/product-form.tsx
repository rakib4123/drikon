'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api-client';
import { CloudinaryUploader } from './cloudinary-uploader';

interface Option {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  brandId: string;
  imageUrl: string;
  imageAlt: string;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: string;
  initial?: Partial<ProductFormState>;
}

const emptyState: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  sku: '',
  price: '',
  compareAtPrice: '',
  currency: 'BDT',
  stock: '0',
  lowStockThreshold: '5',
  isActive: true,
  isFeatured: false,
  categoryId: '',
  brandId: '',
  imageUrl: '',
  imageAlt: '',
};

export function ProductForm({ mode, productId, initial }: ProductFormProps) {
  const router = useRouter();
  const [state, setState] = useState<ProductFormState>({ ...emptyState, ...initial });
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Load dropdown data
  useEffect(() => {
    void apiGet<Option[]>('/api/v1/categories').then(setCategories).catch(() => {});
    void apiGet<Option[]>('/api/v1/brands').then(setBrands).catch(() => {});
  }, []);

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        name: state.name.trim(),
        description: state.description.trim(),
        sku: state.sku.trim(),
        price: parseFloat(state.price),
        currency: state.currency,
        stock: parseInt(state.stock, 10),
        lowStockThreshold: parseInt(state.lowStockThreshold, 10),
        isActive: state.isActive,
        isFeatured: state.isFeatured,
        categoryId: state.categoryId,
      };

      if (state.slug.trim()) payload.slug = state.slug.trim();
      if (state.shortDescription.trim()) payload.shortDescription = state.shortDescription.trim();
      if (state.compareAtPrice.trim()) payload.compareAtPrice = parseFloat(state.compareAtPrice);
      if (state.brandId) payload.brandId = state.brandId;

      // Only include images array on create (UpdateProductDto is partial — backend handles separately)
      if (mode === 'create') {
        if (!state.imageUrl) throw new Error('Please upload a product image first.');
        payload.images = [
          { url: state.imageUrl, alt: state.imageAlt || state.name, position: 0 },
        ];
      }

      if (mode === 'create') {
        await apiPost('/api/v1/products', payload);
      } else if (productId) {
        await apiPatch(`/api/v1/products/${productId}`, payload);
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(typeof err.message === 'string' ? err.message : 'Save failed');
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Name" required>
          <input
            type="text"
            value={state.name}
            onChange={(e) => update('name', e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Slug (optional — auto-generated)">
          <input
            type="text"
            value={state.slug}
            onChange={(e) => update('slug', e.target.value)}
            placeholder="e.g. drikon-voyager-backpack"
            className="input"
          />
        </Field>
      </div>

      <Field label="SKU" required>
        <input
          type="text"
          value={state.sku}
          onChange={(e) => update('sku', e.target.value)}
          required
          className="input"
        />
      </Field>

      <Field label="Short description (max 500 chars)">
        <input
          type="text"
          maxLength={500}
          value={state.shortDescription}
          onChange={(e) => update('shortDescription', e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Full description" required>
        <textarea
          rows={5}
          value={state.description}
          onChange={(e) => update('description', e.target.value)}
          required
          minLength={10}
          className="input resize-y"
        />
      </Field>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Price (BDT)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.price}
            onChange={(e) => update('price', e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Compare-at price">
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.compareAtPrice}
            onChange={(e) => update('compareAtPrice', e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Stock" required>
          <input
            type="number"
            min="0"
            value={state.stock}
            onChange={(e) => update('stock', e.target.value)}
            required
            className="input"
          />
        </Field>
        <Field label="Low-stock alert">
          <input
            type="number"
            min="0"
            value={state.lowStockThreshold}
            onChange={(e) => update('lowStockThreshold', e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Category" required>
          <select
            value={state.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            required
            className="input"
          >
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Brand (optional)">
          <select
            value={state.brandId}
            onChange={(e) => update('brandId', e.target.value)}
            className="input"
          >
            <option value="">— No brand —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {mode === 'create' && (
        <>
          <CloudinaryUploader
            value={state.imageUrl || null}
            onChange={(url) => update('imageUrl', url ?? '')}
          />
          {state.imageUrl && (
            <Field label="Image alt text (for accessibility)">
              <input
                type="text"
                value={state.imageAlt}
                onChange={(e) => update('imageAlt', e.target.value)}
                placeholder="e.g. Black backpack with chrome zippers"
                className="input"
              />
            </Field>
          )}
        </>
      )}

      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="w-4 h-4"
          />
          Active (visible in shop)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isFeatured}
            onChange={(e) => update('isFeatured', e.target.checked)}
            className="w-4 h-4"
          />
          Featured on homepage
        </label>
      </div>

      {serverError && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><Save className="w-4 h-4" />{mode === 'create' ? 'Create product' : 'Save changes'}</>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
