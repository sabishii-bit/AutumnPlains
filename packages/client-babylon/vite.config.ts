import { defineConfig } from 'vite';
import path from 'path';

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
  },
  // Serve assets from the @autumnplains/assets package
  publicDir: path.resolve(__dirname, '../assets/public')
});
