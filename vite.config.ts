/// <reference types="vitest" />
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
          injectRegister: 'auto',
          manifest: {
            name: 'Wohnpro Guide',
            short_name: 'Wohnpro',
            description: 'Dein Wohnprojekt Guide',
            theme_color: '#f8fafc',
            background_color: '#f8fafc',
            display: 'standalone',
            start_url: '/',
            icons: [
              {
                src: 'icon.svg',
                sizes: '192x192 512x512',
                type: 'image/svg+xml',
                purpose: 'any maskable'
              },
              {
                src: 'icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: 'icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          devOptions: {
            enabled: true
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_PRO_API_KEY || env.GEMINI_PRO_API_KEY || process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_PRO_API_KEY || env.GEMINI_PRO_API_KEY || process.env.GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_PRO_API_KEY': JSON.stringify(process.env.GEMINI_PRO_API_KEY || env.GEMINI_PRO_API_KEY),
        'process.env.GCP_PROJECT': JSON.stringify(process.env.GCP_PROJECT || env.GCP_PROJECT),
        'process.env.GCP_LOCATION': JSON.stringify(process.env.GCP_LOCATION || env.GCP_LOCATION)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext'
      },
      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext'
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./setupTests.ts'],
      }
    };
});
