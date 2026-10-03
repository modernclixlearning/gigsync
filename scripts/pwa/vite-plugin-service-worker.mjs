// Plugin de Vite que genera sw.js con workbox-build (issue #39).
//
// Por qué así y no vite-plugin-pwa: con TanStack Start + Nitro el cliente se
// construye como environment `client` cuyo outDir lo fija Nitro
// (`.output/public` en node-server, `.vercel/output/static` con el preset
// vercel). vite-plugin-pwa globbeaba el `build.outDir` de nivel superior
// (`dist/`, vacío) → "precache 0 entries" y un sw.js que nunca se publicaba.
//
// Acá el SW se genera en el `closeBundle` del environment `client`, sobre SU
// outDir real y ANTES de que Nitro arme su build: así sw.js queda en la salida
// estática de cualquier preset (y en el manifest de assets del node-server).
import { createHash } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateSW } from 'workbox-build'
import { createSwConfig } from './sw-config.mjs'

/**
 * Id de build derivado de los nombres (con hash de contenido) de los assets
 * del cliente: cambia en cada deploy que cambia el bundle, y es la revisión
 * del documento shell precacheado.
 * @param {string} staticDir
 */
export function computeBuildId(staticDir) {
  const assetsDir = resolve(staticDir, 'assets')
  const names = existsSync(assetsDir) ? readdirSync(assetsDir).sort() : []
  return createHash('sha256').update(names.join('\n')).digest('hex').slice(0, 16)
}

/**
 * Genera sw.js en `staticDir` y devuelve el nº de entradas precacheadas.
 * Falla si el precache no tiene assets del build (la regresión exacta de #39).
 * @param {string} staticDir
 */
export async function buildServiceWorker(staticDir) {
  const config = createSwConfig(staticDir, computeBuildId(staticDir))
  const { count, size, warnings } = await generateSW(config)
  for (const warning of warnings) console.warn(`[pwa] warning: ${warning}`)
  console.log(
    `[pwa] sw.js generado en ${staticDir} — precache ${count} entries ` +
      `(${(size / 1024).toFixed(1)} KiB)`,
  )
  if (count <= 1) {
    throw new Error('[pwa] precache sin assets del build: abortando para no publicar un SW vacío.')
  }
  return count
}

/** @returns {import('vite').Plugin} */
export function serviceWorkerPlugin() {
  return {
    name: 'gigsync:service-worker',
    apply: 'build',
    applyToEnvironment: (environment) => environment.name === 'client',
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        const { root, build } = this.environment.config
        await buildServiceWorker(resolve(root, build.outDir))
      },
    },
  }
}
