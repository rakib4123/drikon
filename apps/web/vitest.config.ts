import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests live beside the code in src/. The e2e/ directory is Playwright's
    // — without this exclude, Vitest's default glob picks those specs up and dies
    // on the @playwright/test import.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(dirname, './src') },
  },
});
