/**
 * How strongly each beat of a bar is accented by the metronome.
 *
 * Simple meters (4/4, 3/4, 5/4, 7/8…) only mark the first beat. Compound
 * meters (6/8, 9/8, 12/8) are felt in groups of three eighths, so every group
 * starts with an accent: 6/8 accents the 1st and the 4th eighth.
 */

export type BeatAccent = 'strong' | 'group' | 'normal'

/** Beats per group for a compound meter, or 0 when the meter has no groups. */
export function beatGroupSize(beatsPerBar: number, unit: number): number {
  return unit === 8 && beatsPerBar >= 6 && beatsPerBar % 3 === 0 ? 3 : 0
}

/** Accent of the beat at `beatInBar` (0-based) in a bar of `beatsPerBar` beats of 1/`unit`. */
export function beatAccent(beatInBar: number, beatsPerBar: number, unit: number): BeatAccent {
  if (beatInBar === 0) return 'strong'
  const group = beatGroupSize(beatsPerBar, unit)
  return group > 0 && beatInBar % group === 0 ? 'group' : 'normal'
}

/**
 * The number said for the beat at `beatInBar` (0-based): the position in the
 * bar, or in its group of three in a compound meter (6/8 is counted
 * "1 2 3 1 2 3", 12/8 "1 2 3 1 2 3 1 2 3 1 2 3").
 */
export function beatCountLabel(beatInBar: number, beatsPerBar: number, unit: number): number {
  const group = beatGroupSize(beatsPerBar, unit)
  return (group > 0 ? beatInBar % group : beatInBar) + 1
}

/** Loudness of a click, relative to the strongest one. */
export const ACCENT_VELOCITY: Record<BeatAccent, number> = {
  strong: 1,
  group: 0.75,
  normal: 1,
}

/** Beats per bar and unit of a "6/8"-style signature; 4/4 when it is not one. */
export function meterOf(signature: string): { beats: number; unit: number } {
  const [beats, unit] = signature.split('/').map(Number)
  return { beats: beats || 4, unit: unit || 4 }
}
