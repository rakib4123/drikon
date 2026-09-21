import { z } from 'zod';

/**
 * Optional 3D model link for a product, rendered by the storefront's WebGL
 * viewer. Models are hosted elsewhere (like product videos), so this only
 * checks the link is https and points at a glTF file. '' clears it.
 */
export const modelUrlSchema = z.union([
  z.literal(''),
  z
    .string()
    .max(2048)
    .url()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && /\.(glb|gltf)$/i.test(url.pathname);
      } catch {
        return false;
      }
    }, 'Must be an https link to a .glb or .gltf file'),
  z.undefined(),
]);
