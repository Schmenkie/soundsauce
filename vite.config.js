import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE && visualizer({
      open: true,
      gzipSize: true,
      filename: 'dist/bundle-analysis.html',
    }),
  ].filter(Boolean),
  server: {
    proxy: {
      // Serverless functions run locally via `npm run dev:api` (scripts/dev-api.mjs)
      '/api': {
        target: `http://localhost:${process.env.DEV_API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes rarely, caches well
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // PostHog analytics
          'vendor-posthog': ['posthog-js'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    exclude: ['e2e/**', 'node_modules/**'],
    css: false,
  },
})
