import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds the whole app into one index.html, so it can be previewed anywhere
// and hosted as plain files (plus sw.js and the manifest for offline/install).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist' },
});
