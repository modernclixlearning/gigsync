// Configuración del service worker de GigSync (issue #39).
//
// Lo consume scripts/pwa/vite-plugin-service-worker.mjs, que genera sw.js en
// el directorio estático REAL que publica Nitro (`.output/public` en
// node-server, `.vercel/output/static` con el preset vercel).
//
// Las funciones de `urlPattern` se serializan dentro de sw.js (workbox-build
// las convierte con toString), así que NO pueden capturar variables de este
// módulo: todo lo que usen tiene que estar dentro del propio cuerpo.

/**
 * Documento shell (ruta `app/routes/app-shell.tsx`, `ssr: false`): sólo el
 * layout raíz, sin contenido de ninguna ruta. Se precachea con la revisión del
 * build y se sirve para cualquier navegación sin red; el router del cliente
 * monta la ruta real de la URL.
 */
export const SHELL_URL = '/app-shell'

/** Prefijo de versión para los caches de runtime (subirlo invalida todo). */
const CACHE_PREFIX = 'gigsync'

/**
 * Navegaciones (carga de documento) del propio origen.
 * @param {{ request: Request, sameOrigin: boolean }} ctx
 */
export const isAppNavigation = ({ request, sameOrigin }) =>
  sameOrigin && request.mode === 'navigate'

/**
 * Chunks JS/CSS con hash del propio origen que no entraron al precache
 * (p. ej. el worker lazy del análisis de audio, #28) → se cachean al usarse.
 * @param {{ url: URL, sameOrigin: boolean }} ctx
 */
export const isHashedAsset = ({ url, sameOrigin }) =>
  sameOrigin && url.pathname.startsWith('/assets/')

/**
 * Modelo de basic-pitch (#28) y cualquier otro modelo servido desde /models/.
 * Fuera del precache para no inflar la primera visita; disponible offline
 * tras el primer uso.
 * @param {{ url: URL, sameOrigin: boolean }} ctx
 */
export const isModelFile = ({ url, sameOrigin }) =>
  sameOrigin && url.pathname.startsWith('/models/')

/**
 * Hojas de estilo de Google Fonts (incluye Material Symbols, que usa la UI).
 * @param {{ url: URL }} ctx
 */
export const isGoogleFontsStylesheet = ({ url }) =>
  url.origin === 'https://fonts.googleapis.com'

/**
 * Ficheros de fuente de Google Fonts.
 * @param {{ url: URL }} ctx
 */
export const isGoogleFontsFile = ({ url }) =>
  url.origin === 'https://fonts.gstatic.com'

/**
 * Opciones de workbox-build `generateSW` para un directorio de salida dado.
 *
 * Cualquier request que no case con una ruta (YouTube, LRCLIB, otras APIs
 * cross-origin) NO pasa por el SW: va directo a red, sin cache.
 *
 * @param {string} globDirectory directorio estático publicado (absoluto)
 * @param {string} buildId revisión del shell (cambia con cada bundle nuevo)
 * @returns {import('workbox-build').GenerateSWOptions}
 */
export function createSwConfig(globDirectory, buildId) {
  return {
    globDirectory,
    swDest: `${globDirectory}/sw.js`,
    // El shell no es un fichero estático (lo renderiza el servidor): el SW lo
    // descarga al instalarse, junto con los assets de ESE mismo build.
    additionalManifestEntries: [{ url: SHELL_URL, revision: buildId }],
    globPatterns: [
      'assets/**/*.{js,css}',
      'icons/**/*.{png,svg}',
      'favicon.ico',
      'manifest.json',
    ],
    globIgnores: [
      // Worker(s) lazy: se cachean en runtime la primera vez que se usan.
      '**/*.worker-*.js',
      '**/*worker*.js',
      'models/**',
      'sw.js',
      'workbox-*.js',
    ],
    // Los ficheros de /assets/ llevan hash en el nombre → no hace falta revision.
    dontCacheBustURLsMatching: /^assets\//,
    // Margen sobre el chunk más grande actual (~350 kB); lo que lo supere
    // igual queda cubierto por la ruta de runtime de /assets/.
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    // Flujo de actualización "prompt": el SW nuevo espera hasta que el
    // usuario acepta el aviso (mensaje SKIP_WAITING) o se cierran todas las
    // pestañas. Nunca se recarga solo en mitad de un show.
    skipWaiting: false,
    clientsClaim: true,
    // Sin navigateFallback global: las navegaciones van primero a red (HTML
    // siempre fresco online) y caen al shell precacheado si no hay red.
    // No se cachea el HTML de cada URL: tras un deploy apuntaría a chunks con
    // hashes viejos que cleanupOutdatedCaches ya borró.
    sourcemap: false,
    runtimeCaching: [
      {
        urlPattern: isAppNavigation,
        // NetworkFirst sólo para poder usar networkTimeoutSeconds (workbox no
        // lo permite con NetworkOnly); `cacheWillUpdate → null` impide guardar
        // el HTML, así que en la práctica es "red o shell".
        handler: 'NetworkFirst',
        options: {
          cacheName: `${CACHE_PREFIX}-pages`,
          // Wifi de bar: si la red no responde en 4 s, servir el shell.
          networkTimeoutSeconds: 4,
          precacheFallback: { fallbackURL: SHELL_URL },
          plugins: [{ cacheWillUpdate: async () => null }],
        },
      },
      {
        urlPattern: isModelFile,
        handler: 'CacheFirst',
        options: {
          cacheName: `${CACHE_PREFIX}-models`,
          expiration: { maxEntries: 20 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: isHashedAsset,
        handler: 'CacheFirst',
        options: {
          cacheName: `${CACHE_PREFIX}-assets`,
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: isGoogleFontsStylesheet,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: `${CACHE_PREFIX}-google-fonts-css`,
          expiration: { maxEntries: 10 },
          // <link rel="stylesheet"> sin crossorigin → respuesta opaca (status 0).
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: isGoogleFontsFile,
        handler: 'CacheFirst',
        options: {
          cacheName: `${CACHE_PREFIX}-google-fonts-files`,
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  }
}
