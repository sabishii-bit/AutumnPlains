import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['@babylonjs/havok']
  }
});
