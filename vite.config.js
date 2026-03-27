import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // GitHub Pages serves repos at /repo-name/ — this ensures asset paths are correct.
  // If you ever add a custom domain, change this to '/'.
  base: '/trail-life-email-gen/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Multi-page app: list every HTML entry point so Vite includes them all in the build.
    // Uses import.meta.dirname (Node 22 ESM standard) instead of __dirname (CJS-only).
    rollupOptions: {
      input: {
        main:    resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
      },
    },
  },
});
