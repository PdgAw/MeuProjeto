import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'NeoLevel Business School',
        short_name: 'NeoLevel',
        description: 'Plataforma oficial da NeoLevel Business School.',
        lang: 'pt-BR',
        theme_color: '#0B1020',
        background_color: '#0B1020',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache Supabase API responses: private data must always come from the server.
        navigateFallbackDenylist: [/^\/auth\/v1/, /^\/rest\/v1/, /^\/storage\/v1/],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
})
