import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { serviceWorkerPlugin } from './scripts/pwa/vite-plugin-service-worker.mjs'

export default defineConfig({
  server: {
    port: 3000,
  },
  publicDir: 'public',
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
    nitro(),
    // Genera sw.js en el outDir real del environment `client` (el directorio
    // estático que publica Nitro). vite-plugin-pwa miraba `dist/` → 0 entries.
    serviceWorkerPlugin(),
  ],
})
