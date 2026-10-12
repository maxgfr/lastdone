/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/lastdone/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'lastdone',
        short_name: 'lastdone',
        description: 'When did I last water the plants? Recurring chores you log in a sentence, with a language model running in your browser.',
        lang: 'en',
        theme_color: '#f6c800',
        background_color: '#fbf7e8',
        display: 'standalone',
        start_url: '/lastdone/',
        scope: '/lastdone/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only: model weights live in WebLLM's own Cache Storage.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}', '**/*-latin-*.woff2', '**/*-latin-ext-*.woff2'],
        // WebLLM's runtime (~6 MB, main thread and worker) is cached on first use, not on install.
        globIgnores: ['**/lib-*.js', '**/worker-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(lib|worker)-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'lastdone-webllm-runtime', expiration: { maxEntries: 6 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
