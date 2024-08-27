import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  assetsInclude: [
    '**/*.gltf',
    '**/*.bin',
    '**/*.jpeg',
    '**/*.jpg',
    '**/*.png',
    '**/*.obj',
    '**/*.mtl',
  ],
  build: {
    outDir: 'dist',
    minify: 'terser',  // Enable terser for minification
    terserOptions: {
      compress: {
        drop_console: true,  // Remove all console statements
        // Optionally, you can specify which console methods to keep:
        // pure_funcs: ['console.warn', 'console.error'],
      },
    },
  },
  publicDir: 'public',
});
