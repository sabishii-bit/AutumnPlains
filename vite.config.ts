import { defineConfig } from 'vite';
import { resolve } from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['path', 'fs'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'ammojs': resolve(__dirname, 'node_modules/ammojs3/dist/ammo.js')
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
    rollupOptions: {
      external: ['fs', 'path'],
    },
  },
  publicDir: 'public',
});
