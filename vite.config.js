import { defineConfig } from 'vite'

export default defineConfig({
  base: '/otter-river-adventure/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  resolve: {
    alias: {
      'three': 'three'
    }
  }
}) 