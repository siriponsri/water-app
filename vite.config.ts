import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/web',
  /* Vite resolves .env files relative to `root`, not to the project directory.
   * With root at apps/web and .env.production at the repo root, every
   * VITE_*_READ_URL was silently dropped from the bundle: the built app had no
   * System DB to read and every domain reported "not configured". Keep this
   * pointing at the folder that actually holds .env.production; the release
   * gate in validation/validate_wiring.mjs fails if it stops working. */
  envDir: '../../',
  publicDir: 'public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
  preview: { host: '127.0.0.1' },
});
