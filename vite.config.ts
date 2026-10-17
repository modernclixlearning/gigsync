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
  ssr: {
    // workbox-window has no `exports` map: left external, Node loads its UMD
    // `main` and the named `Workbox` import breaks dev SSR (every page 500).
    // Bundling it lets Vite use the ESM `module` build. The build already did.
    noExternal: ['workbox-window'],
  },
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
