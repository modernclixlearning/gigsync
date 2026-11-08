/**
 * Hear a chord once, outside the Transport: used by the chord picker so a
 * chord can be auditioned before it is inserted. Plays with the keyboard
 * sound and chord volume chosen in the player (read from the saved settings),
 * the bass note under it, and frees the instrument shortly after.
 */

import * as Tone from 'tone'
import { voiceChord } from './chordVoicing'
import { createKeysInstrument, type ChordInstrument } from './instruments'
import { resolvePlaybackPreferences } from '~/lib/playback'

const STORAGE_KEY = 'gigsync_settings'
const DURATION = 1.4
/** Keep the instrument for a while so the next click doesn't reload samples. */
const IDLE_MS = 8000

let current: { voice: string; instrument: ChordInstrument } | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined

function savedPlayerSettings(): Parameters<typeof resolvePlaybackPreferences>[0] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')?.player
  } catch {
    return undefined
  }
}

function release() {
  clearTimeout(idleTimer)
  current?.instrument.dispose()
  current = null
}

/** Plays `chord` (e.g. "Am7"); resolves once it has started. Silent if it isn't a chord. */
export async function previewChord(chord: string): Promise<void> {
  const voicing = voiceChord(chord)
  if (!voicing) return
  try {
    if (Tone.getContext().state !== 'running') await Tone.start()
    const prefs = resolvePlaybackPreferences(savedPlayerSettings())
    if (current?.voice !== prefs.keysVoice) {
      release()
      current = {
        voice: prefs.keysVoice,
        instrument: createKeysInstrument(prefs.keysVoice, { reportStatus: false }),
      }
    }
    const { synth } = current.instrument
    synth.releaseAll()
    synth.volume.value = Tone.gainToDb(Math.max(0.0001, prefs.chordVolume / 100))
    const pitches = [voicing.bass, ...voicing.chord].map((p) => Tone.Frequency(p, 'midi').toFrequency())
    synth.triggerAttackRelease(pitches, DURATION, undefined, 0.7)
    clearTimeout(idleTimer)
    idleTimer = setTimeout(release, IDLE_MS)
  } catch {
    // No audio available (blocked context, test environment): previewing is optional.
  }
}
