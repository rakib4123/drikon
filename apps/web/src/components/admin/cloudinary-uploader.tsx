'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface CloudinaryUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function CloudinaryUploader({ value, onChange, label = 'Product image' }: CloudinaryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file);
      onChange(result.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-40 h-40 object-cover rounded-xl border border-[color:var(--border)]"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[color:var(--bg)] border border-[color:var(--border)] grid place-items-center hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-40 h-40 rounded-xl border border-dashed border-[color:var(--border)] hover:border-[color:var(--accent)] grid place-items-center text-[color:var(--fg-muted)] hover:text-[color:var(--accent)] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs">Upload image</div>
              <div className="text-[10px] mt-0.5 opacity-60">jpg, png, webp · max 2MB</div>
            </div>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="text-xs text-red-400 mt-1">{error}</div>
      )}
    </div>
  );
}
