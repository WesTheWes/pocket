import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Set only by the GitHub Pages deploy workflow, so local dev/build/preview stay at '/'.
const isGithubPages = process.env.GITHUB_PAGES === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: isGithubPages ? '/pocket/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a new version must never force-reload a live practice
      // session (running metronome, ticking timer). PwaUpdater (src/app/PwaUpdater.tsx) lets a
      // new version install and wait, and only mentions it via the toast once ready.
      registerType: 'prompt',
      // We register the service worker ourselves in PwaUpdater (it needs useToast()), so the
      // plugin must not also inject its own registration script.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'icon-source.svg'],
      manifest: {
        name: 'Pocket',
        short_name: 'Pocket',
        description: 'A local-first tracker for the songs you are learning.',
        theme_color: '#14110f',
        background_color: '#14110f',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The app's own fonts are loaded from the Google Fonts CDN (index.html), which the
        // precache manifest never sees; without this, offline text falls back to a system font
        // until the fonts have been fetched online at least once.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
