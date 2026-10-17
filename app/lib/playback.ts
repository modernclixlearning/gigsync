import type { PlayerPreferences } from '~/types/profile'

/** Pause between songs when a setlist advances on its own. */
export const DEFAULT_AUTO_ADVANCE_DELAY_SECONDS = 15
export const AUTO_ADVANCE_DELAY_MIN = 0
export const AUTO_ADVANCE_DELAY_MAX = 120

/** Bars of metronome clicks before "Play con precuenta" starts the song. */
export const DEFAULT_COUNT_IN_BARS = 1
export const COUNT_IN_BARS_MIN = 1
export const COUNT_IN_BARS_MAX = 4

export interface PlaybackPreferences {
  autoAdvance: boolean
  autoAdvanceDelaySeconds: number
  countInBars: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Settings saved before these options existed don't have them (stored
 * settings aren't merged with the defaults), so every read goes through here.
 */
export function resolvePlaybackPreferences(
  player: Partial<PlayerPreferences> | undefined
): PlaybackPreferences {
  return {
    autoAdvance: player?.autoAdvance ?? false,
    autoAdvanceDelaySeconds: clamp(
      player?.autoAdvanceDelaySeconds ?? DEFAULT_AUTO_ADVANCE_DELAY_SECONDS,
      AUTO_ADVANCE_DELAY_MIN,
      AUTO_ADVANCE_DELAY_MAX
    ),
    countInBars: clamp(player?.countInBars ?? DEFAULT_COUNT_IN_BARS, COUNT_IN_BARS_MIN, COUNT_IN_BARS_MAX),
  }
}

/** Number of clicks in a count-in: whole bars of the song's time signature. */
export function countInBeats(beatsPerBar: number, bars: number): number {
  return Math.max(1, Math.round(beatsPerBar)) * clamp(Math.round(bars), COUNT_IN_BARS_MIN, COUNT_IN_BARS_MAX)
}

/** The transport went past the last beat of the song's timeline. */
export function isSongFinished(currentBeat: number, totalBeats: number): boolean {
  return totalBeats > 0 && currentBeat >= totalBeats
}
