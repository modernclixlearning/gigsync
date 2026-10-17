import { describe, it, expect } from 'vitest'
import { glowTextShadow } from '../SongPlayerContent'

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
