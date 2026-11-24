import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The UI talks to the API with relative URLs only, so the app works from any
// host/origin (local dev, Docker, or a proxied preview) without CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
