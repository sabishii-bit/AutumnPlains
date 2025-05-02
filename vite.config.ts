import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Add empty module shims for Node.js modules used by ammojs3
      fs: resolve(__dirname, './src/empty-module.js'),
      path: resolve(__dirname, './src/empty-module.js'),
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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['ammojs3', 'cannon-es'],
          vendor: ['socket.io-client', 'nipplejs', 'uuid'],
        }
      }
    }
  },
  publicDir: 'public',
});
