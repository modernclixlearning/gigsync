/**
 * Beat grid layout for the chord editor.
 *
 * The editor draws every line on the same fixed time grid: a row is
 * `barsPerRow` bars of `beatsPerBar` beats, so a bar line sits at the same x
 * on every row of every line. Each chord is placed by its start beat and spans
 * exactly its duration — a chord that crosses a row boundary is split into a
 * head segment and continuation segments.
 */

/** One visual piece of a chord on the grid. Positions are in grid units. */
export interface BeatGridSegment {
  /** Index of the chord this segment belongs to */
  index: number
  /** 0-based row */
  row: number
  /** 0-based start column (in units) within the row */
  start: number
  /** Width in units (>= 1) */
  span: number
  /** First segment of the chord — carries the chord name and lyric */
  isHead: boolean
  /** Last segment of the chord — its right edge is the chord's end */
  isTail: boolean
}

export interface BeatGridLayout {
  segments: BeatGridSegment[]
  rows: number
  /** Grid columns per row */
  unitsPerRow: number
  unitsPerBeat: number
}

/**
 * Beats each chord of a lyric line actually lasts during playback — the same
 * rule as `calculateElementDuration`: explicit beats when every chord has them,
 * otherwise `defaultBarsPerLine` bars split evenly across the chords.
 */
export function effectiveLyricChordBeats(
  chords: { beats?: number }[],
  beatsPerBar: number,
  defaultBarsPerLine = 2
): number[] {
  if (chords.length === 0) return []
  if (chords.every((c) => c.beats !== undefined)) return chords.map((c) => c.beats!)
  const each = (defaultBarsPerLine * beatsPerBar) / chords.length
  return chords.map(() => each)
}

export function layoutBeatGrid(
  beats: number[],
  { beatsPerBar, barsPerRow, gridResolution }: { beatsPerBar: number; barsPerRow: number; gridResolution: number }
): BeatGridLayout {
  const unitsPerBeat = Math.max(1, Math.round(1 / gridResolution))
  const unitsPerRow = Math.max(1, barsPerRow * beatsPerBar * unitsPerBeat)
  const segments: BeatGridSegment[] = []

  let cursor = 0
  beats.forEach((b, index) => {
    const span = Math.max(1, Math.round(b * unitsPerBeat))
    const end = cursor + span
    let pos = cursor
    while (pos < end) {
      const row = Math.floor(pos / unitsPerRow)
      const rowEnd = (row + 1) * unitsPerRow
      const segEnd = Math.min(end, rowEnd)
      segments.push({
        index,
        row,
        start: pos - row * unitsPerRow,
        span: segEnd - pos,
        isHead: pos === cursor,
        isTail: segEnd === end,
      })
      pos = segEnd
    }
    cursor = end
  })

  return {
    segments,
    rows: Math.max(1, Math.ceil(cursor / unitsPerRow)),
    unitsPerRow,
    unitsPerBeat,
  }
}
