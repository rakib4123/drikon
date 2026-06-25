'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { UpdateSettingsSchema, type UpdateSettingsInput, type SiteSettings } from '@drikon/shared-types';
import { apiGet, apiPatch, ApiError } from '@/lib/api-client';
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(UpdateSettingsSchema),
  });

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
        }),
      )
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [reset]);

  const logoUrl = watch('logoUrl');
  const accent = watch('accentColor');
  const accent2 = watch('accentColor2');

  const onSubmit = async (values: UpdateSettingsInput) => {
    try {
      await apiPatch('/api/v1/settings', values);
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
        White-label your store. These drive the logo, name, colours, and metadata everywhere.
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
          value={/^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value : '#ef6a20'}
          onChange={(e) => onPick(e.target.value)}
          className="w-10 h-10 rounded-lg border border-[color:var(--border)] bg-transparent cursor-pointer shrink-0"
          aria-label={`${label} colour picker`}
        />
        <input className="input font-mono" placeholder="#ef6a20" {...register} />
      </div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
