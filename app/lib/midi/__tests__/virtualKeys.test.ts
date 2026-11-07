import { describe, it, expect } from 'vitest'
import {
  clampBaseOctave,
  codeForPitch,
  codeLabel,
  noteName,
  octaveKeys,
  octaveStart,
  pitchForCode,
  velocityFromPosition,
  LOWER_ROW_CODES,
  UPPER_ROW_CODES,
} from '../virtualKeys'

describe('virtualKeys', () => {
  it('names pitches the usual way (C4 = 60)', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(61)).toBe('C#4')
    expect(noteName(48)).toBe('C3')
    expect(noteName(71)).toBe('B4')
    expect(octaveStart(4)).toBe(60)
  })

  it('plays the lower octave on the Z row and the upper one on the Q row', () => {
    expect(pitchForCode('KeyZ', 3)).toBe(48) // C3
    expect(pitchForCode('KeyM', 3)).toBe(59) // B3
    expect(pitchForCode('KeyQ', 3)).toBe(60) // C4
    expect(pitchForCode('KeyU', 3)).toBe(71) // B4
    expect(pitchForCode('KeyS', 3)).toBe(49) // C#3, black key on the home row
    expect(pitchForCode('Digit2', 3)).toBe(61) // C#4
    expect(pitchForCode('Space', 3)).toBeNull()
    expect(pitchForCode('KeyA', 3)).toBeNull()
  })

  it('follows the octave', () => {
    expect(pitchForCode('KeyZ', 4)).toBe(60)
    expect(pitchForCode('KeyQ', 4)).toBe(72)
  })

  it('every key of the two octaves has its own computer key, and back', () => {
    expect(new Set([...LOWER_ROW_CODES, ...UPPER_ROW_CODES]).size).toBe(24)
    for (let pitch = 48; pitch < 72; pitch++) {
      const code = codeForPitch(pitch, 3)
      expect(code).not.toBeNull()
      expect(pitchForCode(code as string, 3)).toBe(pitch)
    }
    expect(codeForPitch(47, 3)).toBeNull()
    expect(codeForPitch(72, 3)).toBeNull()
  })

  it('prints the letter or digit on the key', () => {
    expect(codeLabel('KeyZ')).toBe('Z')
    expect(codeLabel('Digit5')).toBe('5')
  })

  it('draws 7 white and 5 black keys, black ones on the borders of the right whites', () => {
    const { whites, blacks } = octaveKeys()
    expect(whites.map((k) => k.semitone)).toEqual([0, 2, 4, 5, 7, 9, 11])
    expect(blacks.map((k) => k.semitone)).toEqual([1, 3, 6, 8, 10])
    const width = 100 / 7
    expect(blacks[0].position).toBeCloseTo(width) // C# between C and D
    expect(blacks[1].position).toBeCloseTo(2 * width) // D# between D and E
    expect(blacks[2].position).toBeCloseTo(4 * width) // F# between F and G (no black between E and F)
  })

  it('keeps the octave in range', () => {
    expect(clampBaseOctave(-3)).toBe(1)
    expect(clampBaseOctave(99)).toBe(6)
    expect(clampBaseOctave(3.4)).toBe(3)
  })

  it('touch velocity grows from the top to the front of the key', () => {
    expect(velocityFromPosition(0)).toBeLessThan(velocityFromPosition(0.5))
    expect(velocityFromPosition(0.5)).toBeLessThan(velocityFromPosition(1))
    expect(velocityFromPosition(5)).toBe(velocityFromPosition(1))
    expect(velocityFromPosition(Number.NaN)).toBe(velocityFromPosition(0.5))
    expect(velocityFromPosition(1)).toBeLessThanOrEqual(127)
  })
})
