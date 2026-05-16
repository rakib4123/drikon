/**
 * Cloudinary unsigned-upload helpers.
 * Cloud name and preset are public — they're enforced server-side by Cloudinary's
 * upload preset configuration (folder, max size, allowed formats).
 */

export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a single file to Cloudinary using the unsigned preset.
 * Returns the secure HTTPS URL of the uploaded image.
 */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Check env vars.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Upload failed (${res.status})`);
  }

  return (await res.json()) as CloudinaryUploadResult;
}
