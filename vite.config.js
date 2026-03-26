import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves repos at /repo-name/ — this ensures asset paths are correct.
  // If you ever add a custom domain, change this to '/'.
  base: '/trail-life-email-gen/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
