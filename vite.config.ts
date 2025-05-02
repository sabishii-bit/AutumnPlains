import { defineConfig } from 'vite';
import { resolve } from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      exclude: ['fs', 'path'],
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
      'ammojs3': resolve(__dirname, 'node_modules/ammojs3/dist/ammo.js')
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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      external: ['fs', 'path'],
      output: {
        manualChunks: {
          ammo: ['ammojs3']
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/ammojs3/, /node_modules/]
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});
