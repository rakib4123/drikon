'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UpdateSettingsSchema, type UpdateSettingsInput, type SiteSettings } from '@drikon/shared-types';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
import { CONTENT_DEFAULTS } from '@/lib/content';
import { CloudinaryUploader } from '@/components/admin/cloudinary-uploader';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(UpdateSettingsSchema),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'features' });

  useEffect(() => {
    apiGet<SiteSettings>('/api/v1/settings')
      .then((s) =>
        reset({
          siteName: s.siteName ?? '',
          tagline: s.tagline ?? '',
          logoUrl: s.logoUrl ?? '',
          faviconUrl: s.faviconUrl ?? '',
          accentColor: s.accentColor ?? '',
          accentColor2: s.accentColor2 ?? '',
          supportEmail: s.supportEmail ?? '',
          socialFacebook: s.socialFacebook ?? '',
          socialInstagram: s.socialInstagram ?? '',
          bkashNumber: s.bkashNumber ?? '',
          bkashInstructions: s.bkashInstructions ?? '',
          bkashEnabled: s.bkashEnabled ?? true,
          codEnabled: s.codEnabled ?? true,
          heroBadge: s.heroBadge ?? '',
          heroTitle: s.heroTitle ?? '',
          heroHighlight: s.heroHighlight ?? '',
          heroSubtitle: s.heroSubtitle ?? '',
          heroCtaLabel: s.heroCtaLabel ?? '',
          heroCtaHref: s.heroCtaHref ?? '',
          heroCtaAltLabel: s.heroCtaAltLabel ?? '',
          heroCtaAltHref: s.heroCtaAltHref ?? '',
          features: s.features ?? [],
          ctaHeading: s.ctaHeading ?? '',
          ctaBody: s.ctaBody ?? '',
          ctaButtonLabel: s.ctaButtonLabel ?? '',
          ctaButtonHref: s.ctaButtonHref ?? '',
          dealsTitle: s.dealsTitle ?? '',
          dealsBlurb: s.dealsBlurb ?? '',
          dealsImage: s.dealsImage ?? '',
          topbarPromo: s.topbarPromo ?? '',
          footerNote: s.footerNote ?? '',
          shippingNote: s.shippingNote ?? '',
          returnsNote: s.returnsNote ?? '',
          warrantyNote: s.warrantyNote ?? '',
          seoKeywords: s.seoKeywords ?? '',
        }),
      )
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [reset]);

  const logoUrl = watch('logoUrl');
  const accent = watch('accentColor');
  const accent2 = watch('accentColor2');
  const dealsImage = watch('dealsImage');

  const onSubmit = async (values: UpdateSettingsInput) => {
    try {
      // Drop blank feature rows so they don't render as empty cards.
      const payload = {
        ...values,
        features: (values.features ?? []).filter((f) => f.title.trim() || f.body.trim()),
      };
      await apiPatch('/api/v1/settings', payload);
      toast.success('Branding saved', { description: 'Your storefront has been updated.' });
      // Re-run the server layout so the brand/accent re-theme everywhere.
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save settings');
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-20 grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-[color:var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-3xl">
      <h1 className="display text-3xl mb-1">Branding &amp; settings</h1>
      <p className="text-[color:var(--fg-muted)] mb-8">
        White-label your store. Everything here is editable — leave a field blank to fall back to the
        built-in default. {'{brand}'} is replaced with your site name.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Identity */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Identity</h2>

          <Field label="Site name" error={errors.siteName?.message}>
            <input className="input" {...register('siteName')} placeholder="Drikon" />
          </Field>
          <Field label="Tagline" error={errors.tagline?.message}>
            <input className="input" {...register('tagline')} placeholder="Vision, engineered." />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <CloudinaryUploader
                label="Brand logo"
                value={logoUrl || null}
                onChange={(url) => setValue('logoUrl', url ?? '', { shouldDirty: true })}
              />
              <p className="text-[11px] text-[color:var(--fg-muted)] mt-2">
                Shown in the navbar &amp; footer. Or paste a URL below.
              </p>
              <input className="input mt-2 text-xs" {...register('logoUrl')} placeholder="https://…/logo.svg" />
            </div>
            <Field label="Favicon URL" error={errors.faviconUrl?.message}>
              <input className="input" {...register('faviconUrl')} placeholder="https://…/favicon.png" />
            </Field>
          </div>
        </section>

        {/* Theme */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Theme accent</h2>
          <p className="text-xs text-[color:var(--fg-muted)] -mt-3">
            Overrides the accent colour across the whole storefront.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <ColorField
              label="Primary accent"
              error={errors.accentColor?.message}
              value={accent}
              onPick={(v) => setValue('accentColor', v, { shouldDirty: true })}
              register={register('accentColor')}
            />
            <ColorField
              label="Secondary accent"
              error={errors.accentColor2?.message}
              value={accent2}
              onPick={(v) => setValue('accentColor2', v, { shouldDirty: true })}
              register={register('accentColor2')}
            />
          </div>
        </section>

        {/* Contact & social */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Contact &amp; social</h2>
          <Field label="Support email" error={errors.supportEmail?.message}>
            <input className="input" {...register('supportEmail')} placeholder="help@yourstore.com" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Facebook URL" error={errors.socialFacebook?.message}>
              <input className="input" {...register('socialFacebook')} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram URL" error={errors.socialInstagram?.message}>
              <input className="input" {...register('socialInstagram')} placeholder="https://instagram.com/…" />
            </Field>
          </div>
        </section>

        {/* Payments */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Payments</h2>
          <p className="text-xs text-[color:var(--fg-muted)] -mt-3">
            Manual payment methods — no gateway integration yet. Toggle a method off to hide it at checkout.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="bKash number" error={errors.bkashNumber?.message}>
              <input className="input" {...register('bkashNumber')} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="bKash instructions (optional override)" error={errors.bkashInstructions?.message}>
              <input
                className="input"
                {...register('bkashInstructions')}
                placeholder="Leave blank to use the default instructions"
              />
            </Field>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" {...register('bkashEnabled')} />
              Accept bKash
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" {...register('codEnabled')} />
              Accept cash on delivery
            </label>
          </div>
        </section>

        {/* Homepage hero (fallback when no banner slides are active) */}
        <section className="card space-y-5">
          <div>
            <h2 className="font-semibold">Homepage hero</h2>
            <p className="text-xs text-[color:var(--fg-muted)] mt-1">
              Shown on the home page when there are no active banner slides.
            </p>
          </div>
          <Field label="Badge" error={errors.heroBadge?.message}>
            <input className="input" {...register('heroBadge')} placeholder={CONTENT_DEFAULTS.heroBadge} />
          </Field>
          <Field label="Headline (one line per row)" error={errors.heroTitle?.message}>
            <textarea className="input" rows={3} {...register('heroTitle')} placeholder={CONTENT_DEFAULTS.heroTitle} />
          </Field>
          <Field label="Highlighted line (gets the gradient)" error={errors.heroHighlight?.message}>
            <input className="input" {...register('heroHighlight')} placeholder={CONTENT_DEFAULTS.heroHighlight} />
          </Field>
          <Field label="Subtitle" error={errors.heroSubtitle?.message}>
            <textarea className="input" rows={2} {...register('heroSubtitle')} placeholder={CONTENT_DEFAULTS.heroSubtitle} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Primary button label" error={errors.heroCtaLabel?.message}>
              <input className="input" {...register('heroCtaLabel')} placeholder={CONTENT_DEFAULTS.heroCtaLabel} />
            </Field>
            <Field label="Primary button link" error={errors.heroCtaHref?.message}>
              <input className="input" {...register('heroCtaHref')} placeholder={CONTENT_DEFAULTS.heroCtaHref} />
            </Field>
            <Field label="Secondary button label" error={errors.heroCtaAltLabel?.message}>
              <input className="input" {...register('heroCtaAltLabel')} placeholder={CONTENT_DEFAULTS.heroCtaAltLabel} />
            </Field>
            <Field label="Secondary button link" error={errors.heroCtaAltHref?.message}>
              <input className="input" {...register('heroCtaAltHref')} placeholder={CONTENT_DEFAULTS.heroCtaAltHref} />
            </Field>
          </div>
        </section>

        {/* Feature strip */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Feature strip</h2>
              <p className="text-xs text-[color:var(--fg-muted)] mt-1">
                The row of selling points under the hero. Leave empty to use defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={() => append({ title: '', body: '' })}
              disabled={fields.length >= 8}
              className="btn-ghost text-xs !py-1.5 !px-3 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {fields.length === 0 && (
            <p className="text-xs text-[color:var(--fg-muted)]">
              No custom features — the storefront shows the built-in set.
            </p>
          )}
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="flex gap-2 items-start">
                <div className="flex-1 grid sm:grid-cols-2 gap-2">
                  <input className="input" {...register(`features.${i}.title`)} placeholder="Title (e.g. 100% genuine)" />
                  <input className="input" {...register(`features.${i}.body`)} placeholder="Body (e.g. Official warranty)" />
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove feature"
                  className="mt-2 text-[color:var(--fg-muted)] hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Editorial CTA band */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Editorial CTA band</h2>
          <Field label="Heading" error={errors.ctaHeading?.message}>
            <input className="input" {...register('ctaHeading')} placeholder={CONTENT_DEFAULTS.ctaHeading} />
          </Field>
          <Field label="Body" error={errors.ctaBody?.message}>
            <textarea className="input" rows={2} {...register('ctaBody')} placeholder={CONTENT_DEFAULTS.ctaBody} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Button label" error={errors.ctaButtonLabel?.message}>
              <input className="input" {...register('ctaButtonLabel')} placeholder={CONTENT_DEFAULTS.ctaButtonLabel} />
            </Field>
            <Field label="Button link" error={errors.ctaButtonHref?.message}>
              <input className="input" {...register('ctaButtonHref')} placeholder={CONTENT_DEFAULTS.ctaButtonHref} />
            </Field>
          </div>
        </section>

        {/* Category "deals" tile */}
        <section className="card space-y-5">
          <h2 className="font-semibold">“Deals” tile</h2>
          <p className="text-xs text-[color:var(--fg-muted)] -mt-3">
            The promo tile in the “Shop by category” grid.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Title" error={errors.dealsTitle?.message}>
              <input className="input" {...register('dealsTitle')} placeholder={CONTENT_DEFAULTS.dealsTitle} />
            </Field>
            <Field label="Blurb" error={errors.dealsBlurb?.message}>
              <input className="input" {...register('dealsBlurb')} placeholder={CONTENT_DEFAULTS.dealsBlurb} />
            </Field>
          </div>
          <div>
            <CloudinaryUploader
              label="Tile image (optional)"
              value={dealsImage || null}
              onChange={(url) => setValue('dealsImage', url ?? '', { shouldDirty: true })}
            />
            <input className="input mt-2 text-xs" {...register('dealsImage')} placeholder="…or paste image URL" />
            {errors.dealsImage?.message && <span className="block text-xs text-red-600 mt-1">{errors.dealsImage.message}</span>}
          </div>
        </section>

        {/* Chrome: top bar + footer */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Top bar &amp; footer</h2>
          <Field label="Top bar promo" error={errors.topbarPromo?.message}>
            <input className="input" {...register('topbarPromo')} placeholder={CONTENT_DEFAULTS.topbarPromo} />
          </Field>
          <Field label="Footer note" error={errors.footerNote?.message}>
            <input className="input" {...register('footerNote')} placeholder={CONTENT_DEFAULTS.footerNote} />
          </Field>
        </section>

        {/* Product trust badges */}
        <section className="card space-y-5">
          <h2 className="font-semibold">Product trust badges</h2>
          <p className="text-xs text-[color:var(--fg-muted)] -mt-3">
            The three signals under the add-to-cart on every product page.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Shipping" error={errors.shippingNote?.message}>
              <input className="input" {...register('shippingNote')} placeholder={CONTENT_DEFAULTS.shippingNote} />
            </Field>
            <Field label="Returns" error={errors.returnsNote?.message}>
              <input className="input" {...register('returnsNote')} placeholder={CONTENT_DEFAULTS.returnsNote} />
            </Field>
            <Field label="Warranty" error={errors.warrantyNote?.message}>
              <input className="input" {...register('warrantyNote')} placeholder={CONTENT_DEFAULTS.warrantyNote} />
            </Field>
          </div>
        </section>

        {/* SEO */}
        <section className="card space-y-5">
          <h2 className="font-semibold">SEO</h2>
          <Field label="Meta keywords (comma-separated)" error={errors.seoKeywords?.message}>
            <input className="input" {...register('seoKeywords')} placeholder={CONTENT_DEFAULTS.seoKeywords} />
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save changes</>}
          </button>
          {!isDirty && <span className="text-xs text-[color:var(--fg-muted)]">No unsaved changes</span>}
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function ColorField({
  label,
  error,
  value,
  onPick,
  register,
}: {
  label: string;
  error?: string;
  value?: string;
  onPick: (v: string) => void;
  register: ReturnType<ReturnType<typeof useForm<UpdateSettingsInput>>['register']>;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : '#151515'}
          onChange={(e) => onPick(e.target.value)}
          className="w-10 h-10 rounded-lg border border-[color:var(--border)] bg-transparent cursor-pointer shrink-0"
          aria-label={`${label} colour picker`}
        />
        <input className="input font-mono" placeholder="#151515" {...register} />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
