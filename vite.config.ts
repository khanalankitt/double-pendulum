import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssMinify: 'esbuild',
    minify: 'esbuild',
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split heavy 3rd-party deps so the page shell can stream in independently.
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/postprocessing/')) return 'postfx';
          if (id.includes('node_modules/lil-gui/')) return 'gui';
        },
      },
    },
  },
});
