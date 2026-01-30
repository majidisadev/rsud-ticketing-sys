import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'manifest.json', 'notification-sound.mp3'],
      manifest: {
        short_name: 'Ticketing RSUD',
        name: 'Sistem Ticketing RSUD',
        description: 'Sistem Ticketing RSUD - Laporan dan tracking masalah',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
          { src: '/logo192.png', type: 'image/png', sizes: '192x192' },
          { src: '/logo512.png', type: 'image/png', sizes: '512x512' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.js', '**/*.css', '**/*.html', '**/*.ico', '**/*.png'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50 },
            },
          },
        ],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
