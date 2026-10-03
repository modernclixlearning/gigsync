import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

/**
 * The basic-pitch model is served from public/models/basic-pitch (same
 * origin, no CDN). Guard against the copy drifting from the installed
 * @spotify/basic-pitch version after a dependency bump.
 */
describe('bundled basic-pitch model', () => {
  const root = resolve(__dirname, '../../../..')
  const publicDir = resolve(root, 'public/models/basic-pitch')
  const pkgDir = resolve(root, 'node_modules/@spotify/basic-pitch/model')

  it.each(readdirSync(pkgDir))('public copy of %s matches the installed package', file => {
    expect(readFileSync(resolve(publicDir, file)).equals(readFileSync(resolve(pkgDir, file)))).toBe(true)
  })

  it('manifest references only files that exist next to it', () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDir, 'model.json'), 'utf8'))
    const paths: string[] = manifest.weightsManifest.flatMap((g: { paths: string[] }) => g.paths)
    const present = new Set(readdirSync(publicDir))
    for (const p of paths) expect(present.has(p)).toBe(true)
  })
})
