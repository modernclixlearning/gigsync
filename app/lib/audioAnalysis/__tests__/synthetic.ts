import type { NoteEvent } from '../types'

const NOTE_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, 'D#': 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, Ab: 8, 'G#': 8, A: 9, Bb: 10, 'A#': 10, B: 11,
}

/** Pitch classes of a chord label like "C", "Am", "G7", "Dm7". */
export function chordTones(label: string): number[] {
  const m = label.match(/^([A-G][#b]?)(m7|m|7)?$/)
  if (!m) throw new Error(`unsupported test chord ${label}`)
  const root = NOTE_PC[m[1]]
  const ivs = m[2] === 'm' ? [0, 3, 7] : m[2] === '7' ? [0, 4, 7, 10] : m[2] === 'm7' ? [0, 3, 7, 10] : [0, 4, 7]
  return ivs.map(iv => (root + iv) % 12)
}

export interface SyntheticSongOptions {
  bpm: number
  beatsPerBar?: number
  /** One entry per bar; an array entry splits the bar evenly. */
  bars: (string | string[])[]
  /** Silent beats before the first bar. */
  leadInBeats?: number
}

/**
 * Strummed-chord note events: every beat re-attacks the chord tones in the
 * C4 octave, plus a bass root (C2 octave) on each cell start.
 */
export function syntheticSong({ bpm, beatsPerBar = 4, bars, leadInBeats = 0 }: SyntheticSongOptions): {
  notes: NoteEvent[]
  durationSeconds: number
} {
  const beat = 60 / bpm
  const notes: NoteEvent[] = []
  let t = leadInBeats * beat
  for (const bar of bars) {
    const cells = Array.isArray(bar) ? bar : [bar]
    const beatsPerCell = beatsPerBar / cells.length
    for (const chord of cells) {
      const tones = chordTones(chord)
      notes.push({ startTimeSeconds: t, durationSeconds: beatsPerCell * beat * 0.95, pitchMidi: 36 + tones[0], amplitude: 0.8 })
      for (let b = 0; b < beatsPerCell; b++) {
        const start = t + b * beat
        for (const pc of tones) {
          notes.push({ startTimeSeconds: start, durationSeconds: beat * 0.9, pitchMidi: 60 + pc, amplitude: b === 0 ? 0.7 : 0.5 })
        }
      }
      t += beatsPerCell * beat
    }
  }
  return { notes, durationSeconds: t + beat }
}
