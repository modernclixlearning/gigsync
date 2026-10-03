import { describe, expect, it } from 'vitest'
import {
  SHELL_URL,
  createSwConfig,
  isAppNavigation,
  isGoogleFontsFile,
  isGoogleFontsStylesheet,
  isHashedAsset,
  isModelFile,
} from '../sw-config.mjs'

const ORIGIN = 'https://playgigsync.vercel.app'

function ctx(href: string, mode: RequestMode = 'cors') {
  const url = new URL(href)
  return {
    url,
    sameOrigin: url.origin === ORIGIN,
    request: { mode } as Request,
  }
}

type RuntimeEntry = NonNullable<ReturnType<typeof createSwConfig>['runtimeCaching']>[number]
type Matcher = (c: ReturnType<typeof ctx>) => boolean

describe('sw-config (#39)', () => {
  const config = createSwConfig('/tmp/static', 'build123')
  const runtime = config.runtimeCaching as RuntimeEntry[]
  const matchers = runtime.map((r) => r.urlPattern as unknown as Matcher)
  const matching = (c: ReturnType<typeof ctx>) => runtime.filter((_, i) => matchers[i](c))

  it('genera el SW dentro del directorio estático real', () => {
    expect(config.globDirectory).toBe('/tmp/static')
    expect(config.swDest).toBe('/tmp/static/sw.js')
  })

  it('precachea el shell con la revisión del build', () => {
    expect(SHELL_URL).toBe('/app-shell')
    expect(config.additionalManifestEntries).toEqual([{ url: SHELL_URL, revision: 'build123' }])
  })

  it('precachea assets JS/CSS, íconos y manifest', () => {
    expect(config.globPatterns).toEqual(
      expect.arrayContaining([
        'assets/**/*.{js,css}',
        'icons/**/*.{png,svg}',
        'manifest.json',
      ]),
    )
  })

  it('deja fuera del precache el modelo y los workers lazy', () => {
    expect(config.globIgnores).toEqual(expect.arrayContaining(['models/**', '**/*worker*.js']))
  })

  it('usa flujo de actualización con aviso (sin skipWaiting automático)', () => {
    expect(config.skipWaiting).toBe(false)
    expect(config.cleanupOutdatedCaches).toBe(true)
  })

  it('navegaciones: red primero y fallback al shell precacheado', async () => {
    const [entry] = matching(ctx(`${ORIGIN}/song/abc`, 'navigate'))
    expect(entry.handler).toBe('NetworkFirst')
    expect(entry.options?.networkTimeoutSeconds).toBeGreaterThan(0)
    expect(entry.options?.precacheFallback?.fallbackURL).toBe(SHELL_URL)
    // Nunca guarda el HTML por URL (quedaría apuntando a chunks borrados).
    const [plugin] = entry.options?.plugins ?? []
    return expect(plugin.cacheWillUpdate?.({} as never)).resolves.toBeNull()
  })

  it('modelo de basic-pitch (NetworkFirst) y worker chunk (CacheFirst) en runtime', () => {
    const [model] = matching(ctx(`${ORIGIN}/models/basic-pitch/group1-shard1of1.bin`))
    expect(model.handler).toBe('NetworkFirst')
    expect(model.options?.cacheName).toBe('gigsync-models')

    const [worker] = matching(ctx(`${ORIGIN}/assets/analysis.worker-abc123.js`))
    expect(worker.handler).toBe('CacheFirst')
    expect(worker.options?.cacheName).toBe('gigsync-assets')
  })

  it('YouTube, LRCLIB y otros cross-origin no pasan por ningún cache', () => {
    for (const href of [
      'https://www.youtube.com/iframe_api',
      'https://www.youtube-nocookie.com/embed/xyz',
      'https://i.ytimg.com/vi/xyz/hqdefault.jpg',
      'https://lrclib.net/api/search?q=foo',
      'https://evil.example/models/x.bin',
      'https://evil.example/assets/x.js',
    ]) {
      expect(matching(ctx(href)), href).toHaveLength(0)
      expect(matching(ctx(href, 'navigate')), href).toHaveLength(0)
    }
  })

  it('Google Fonts sí se cachea (Material Symbols de la UI)', () => {
    expect(isGoogleFontsStylesheet(ctx('https://fonts.googleapis.com/css2?family=X'))).toBe(true)
    expect(isGoogleFontsFile(ctx('https://fonts.gstatic.com/s/x.woff2'))).toBe(true)
  })

  it('los matchers son autocontenidos (se serializan con toString en sw.js)', () => {
    for (const fn of [isAppNavigation, isHashedAsset, isModelFile, isGoogleFontsFile, isGoogleFontsStylesheet]) {
      // eslint-disable-next-line no-new-func
      const rebuilt = new Function(`return (${fn.toString()})`)() as Matcher
      expect(typeof rebuilt).toBe('function')
      rebuilt(ctx(`${ORIGIN}/models/a`, 'navigate'))
    }
  })
})
