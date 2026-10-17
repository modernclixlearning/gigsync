import { describe, it, expect } from 'vitest'
import { beatHighlightCss, chordColorsCss, glowTextShadow, pickupHighlightCss } from '../beatHighlightCss'

describe('glowTextShadow', () => {
  it('100 keeps the original glow', () => {
    expect(glowTextShadow('#38bdf8', 100)).toBe('0 0 0.4em #38bdf8')
  })

  it('lower values fade the glow color', () => {
    expect(glowTextShadow('#000000', 40)).toBe('0 0 0.4em color-mix(in srgb, #000000 40%, transparent)')
  })

  it('0 turns the glow off', () => {
    expect(glowTextShadow('#38bdf8', 0)).toBe('none')
  })
})

const STYLE = {
  textColor: '#38bdf8',
  bgColor: 'rgba(56, 189, 248, 0.35)',
  glowColor: '#38bdf8',
  glowIntensity: 100,
}

describe('beatHighlightCss', () => {
  it('lights the lyric in color and boxes the chord when the modes differ', () => {
    const css = beatHighlightCss('l3', 1, { ...STYLE, lyricMode: 'text', chordMode: 'background' })
    const [lyricRule, chordRule] = css.split('> span:first-child')
    expect(lyricRule).toContain('[data-element-id="l3"] [data-chord-index="1"] {')
    expect(lyricRule).toContain('color: #38bdf8;')
    expect(lyricRule).not.toContain('background-color')
    expect(chordRule).toContain('background-color: rgba(56, 189, 248, 0.35);')
    expect(chordRule).toContain('text-shadow: none;')
  })

  it('boxes the lyric and lights the chord in color the other way around', () => {
    const css = beatHighlightCss('l3', 0, { ...STYLE, lyricMode: 'background', chordMode: 'text' })
    const [lyricRule, chordRule] = css.split('> span:first-child')
    expect(lyricRule).toContain('background-color: rgba(56, 189, 248, 0.35);')
    expect(chordRule).toContain('color: #38bdf8;')
    expect(chordRule).not.toContain('background-color')
  })
})

describe('chordColorsCss', () => {
  it('is empty while no chord color is customized', () => {
    expect(chordColorsCss('[data-gs-lyrics]', null, null)).toBe('')
  })

  it('colors every chord label inside the lyrics', () => {
    const css = chordColorsCss('[data-gs-lyrics]', '#ffffff', '#112233')
    expect(css).toContain('[data-gs-lyrics] .gs-chord {')
    expect(css).toContain('color: #ffffff;')
    expect(css).toContain('background-color: #112233;')
  })
})

describe('pickupHighlightCss', () => {
  it('lights the next line and its levare words with the lyric highlight', () => {
    const css = pickupHighlightCss('element-1', { ...STYLE, lyricMode: 'text', chordMode: 'background' })
    expect(css).toContain('[data-element-id="element-1"] {')
    expect(css).toContain('opacity: 1;')
    expect(css).toContain('[data-element-id="element-1"] [data-pickup] {')
    expect(css).toContain('color: #38bdf8;')
  })
})
