import { describe, it, expect } from 'vitest'
import { createPitchStabilizer, semitoneToNote, type StablePitch } from '../pitchStabilizer'

const A4 = 440
/** Frequency `cents` away from the note `semitones` from A4. */
const freq = (semitones: number, cents = 0) => A4 * 2 ** ((semitones + cents / 100) / 12)
const frame = (frequency: number, confidence = 0.95) => ({ frequency, confidence })

/** Feeds a list of readings 33 ms apart, returns every output. */
function run(readings: ({ frequency: number; confidence: number } | null)[], options = {}, start = 0) {
  const stabilizer = createPitchStabilizer(options)
  return readings.map((reading, i) => stabilizer.push(reading, start + i * 33, A4))
}

describe('semitoneToNote', () => {
  it('names the note and the octave', () => {
    expect(semitoneToNote(0)).toEqual({ note: 'A', octave: 4 })
    expect(semitoneToNote(-9)).toEqual({ note: 'C', octave: 4 })
    expect(semitoneToNote(-10)).toEqual({ note: 'B', octave: 3 })
    expect(semitoneToNote(3)).toEqual({ note: 'C', octave: 5 })
    expect(semitoneToNote(-29)).toEqual({ note: 'E', octave: 2 }) // low E of a guitar
  })
})

describe('createPitchStabilizer', () => {
  it('shows nothing until a few good readings have come in', () => {
    const out = run([frame(440), frame(440), frame(440)])
    expect(out[0]).toBeNull()
    expect(out[1]).toBeNull()
    expect(out[2]).toMatchObject({ note: 'A', octave: 4, cents: 0 })
  })

  it('ignores frames the detector is not sure of', () => {
    const out = run([frame(440), frame(440), frame(440), frame(300, 0.3), frame(440)])
    expect(out[3]?.note).toBe('A') // held, not replaced
    expect(out[4]).toMatchObject({ note: 'A', cents: 0 })
  })

  it('a wobbly string settles: the cents hardly move for ±6 cents of jitter', () => {
    const wobble = [6, -6, 4, -5, 6, -4, 5, -6, 3, -3, 6, -6, 4, -4, 5, -5, 6, -6, 4, -4]
    const out = run(wobble.map((c) => frame(freq(0, 12 + c)))) // centred on +12 cents
    const settled = out.slice(8).map((p) => (p as StablePitch).cents)
    expect(Math.max(...settled) - Math.min(...settled)).toBeLessThanOrEqual(3)
    expect(Math.abs(settled[settled.length - 1] - 12)).toBeLessThanOrEqual(4)
  })

  it('throws out a one-frame octave jump', () => {
    const readings = Array.from({ length: 10 }, () => frame(freq(0, 10)))
    readings[6] = frame(freq(12, 10)) // detector jumped an octave up for a frame
    const out = run(readings)
    expect(out.slice(3).every((p) => p?.note === 'A' && p.octave === 4)).toBe(true)
  })

  it('sits dead centre within a cent or two of the note', () => {
    const out = run(Array.from({ length: 12 }, () => frame(freq(0, 1))))
    expect((out[out.length - 1] as StablePitch).cents).toBe(0)
  })

  it('keeps the last reading through a short gap and lets go after it', () => {
    const stabilizer = createPitchStabilizer({ holdMs: 400 })
    let now = 0
    for (let i = 0; i < 6; i++) stabilizer.push(frame(440), (now += 33), A4)
    expect(stabilizer.push(null, (now += 100), A4)).toMatchObject({ note: 'A' })
    expect(stabilizer.push(null, (now += 100), A4)).toMatchObject({ note: 'A' })
    expect(stabilizer.push(null, (now += 400), A4)).toBeNull()
    // A new note after the gap has to warm up again.
    expect(stabilizer.push(frame(freq(2)), (now += 33), A4)).toBeNull()
  })

  it('does not jump to the next note when a string drifts a bit past 50 cents', () => {
    // 52 cents sharp of A4 is closer to A#4, but a slightly late reading is not a new note.
    const out = run([...Array.from({ length: 8 }, () => frame(freq(0, 40))), ...Array.from({ length: 3 }, () => frame(freq(0, 55)))])
    expect(out[out.length - 1]).toMatchObject({ note: 'A', octave: 4 })
  })

  it('moves to another note only when it is clearly played, and then right away', () => {
    const out = run([
      ...Array.from({ length: 8 }, () => frame(freq(0))), // A4
      ...Array.from({ length: 12 }, () => frame(freq(2))), // B4
    ])
    // Still on A while B has just begun…
    expect(out[9]?.note).toBe('A')
    // …and on B with the cents already right, not gliding there.
    const last = out[out.length - 1] as StablePitch
    expect(last).toMatchObject({ note: 'B', octave: 4, cents: 0 })
  })

  it('follows a peg being turned quickly when far from the note', () => {
    // From 30 cents flat to in tune in a few frames: the needle must not lag behind for long.
    const out = run([
      ...Array.from({ length: 6 }, () => frame(freq(0, -30))),
      ...Array.from({ length: 8 }, () => frame(freq(0, 0))),
    ])
    const last = out[out.length - 1] as StablePitch
    expect(Math.abs(last.cents)).toBeLessThanOrEqual(5)
  })

  it('reports the smoothed frequency of the locked note', () => {
    const out = run(Array.from({ length: 12 }, () => frame(freq(0, 20))))
    const last = out[out.length - 1] as StablePitch
    expect(last.frequency).toBeCloseTo(freq(0, 20), 1)
  })

  it('starts over when the reference pitch changes', () => {
    const stabilizer = createPitchStabilizer()
    for (let i = 0; i < 6; i++) stabilizer.push(frame(440), i * 33, 440)
    // Same sound, A4 now 432: it is no longer an in-tune A.
    expect(stabilizer.push(frame(440), 300, 432)).toBeNull()
  })
})
