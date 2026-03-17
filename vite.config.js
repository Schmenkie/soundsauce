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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes rarely, caches well
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client — auth + DB + storage
          'vendor-supabase': ['@supabase/supabase-js'],
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
