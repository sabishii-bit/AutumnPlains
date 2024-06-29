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
    '**/*.mtl'
  ],
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
});
