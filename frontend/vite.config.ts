import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasmPack from 'vite-plugin-wasm-pack';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasmPack(['../rust-core'], { verbose: false }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
    outDir: '../release',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mermaid: ['mermaid'],
          epub: ['epubjs'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['zen-core'],
  },
});
