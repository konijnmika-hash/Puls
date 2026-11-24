import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run build` -> normal PWA build in dist/
// `npm run build:single` -> one self-contained HTML file in dist-single/ (handy for sharing a preview)
// `npm run telefoon` -> dev server over https on your network, so the phone camera (barcode scanner) works
export default defineConfig(({ mode }) => ({
  base: process.env.FRIS_BASE ?? './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : []), ...(mode === 'telefoon' ? [basicSsl({ name: 'puls' })] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    // naast de app ook het beheeroverzicht (admin.html)
    rollupOptions: mode === 'single' ? undefined : { input: { main: 'index.html', admin: 'admin.html' } },
  },
  test: { environment: 'node' },
}));
