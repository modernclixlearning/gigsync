/**
 * useDrumPlayback Hook
 *
 * The mini drum machine: a 16th-note loop on the shared Transport that plays
 * the chosen rhythm pattern. The step is read from the Transport's own tick at
 * the scheduled time, so — like the click and the chords — it follows
 * play/pause, seek and tempo changes (including a DAW's MIDI Clock).
 */

import { useEffect, useMemo, useRef } from 'react'
import * as Tone from 'tone'
import { DRUM_PATTERN_DEFS, STEPS_PER_BEAT, laneVelocity, type DrumPart, type DrumPattern } from '~/lib/audio/bandSound'
import { resolveDrumLanes, type SongDrumPattern } from '~/lib/audio/bandPatterns'
import { createDrumKit, type DrumKit } from '~/lib/audio/instruments'

export interface UseDrumPlaybackOptions {
  enabled: boolean
  isPlaying: boolean
  pattern: DrumPattern
  /** The pattern written for the song; when it has hits it plays instead of `pattern`. */
  songPattern?: SongDrumPattern
  beatsPerBar: number
  /** 0..1 */
  volume?: number
}

const PARTS = Object.keys(DRUM_PATTERN_DEFS.rock) as DrumPart[]

/** 16th-note step the Transport is at, for a given tick. */
export function stepAtTick(ticks: number, ppq: number): number {
  return Math.round(ticks / (ppq / STEPS_PER_BEAT))
}

export function useDrumPlayback({ enabled, isPlaying, pattern, songPattern, beatsPerBar, volume = 0.5 }: UseDrumPlaybackOptions): void {
  const kitRef = useRef<DrumKit | null>(null)
  // Read from the audio callback, outside React's render cycle.
  const lanes = useMemo(() => resolveDrumLanes(songPattern, pattern), [songPattern, pattern])
  const optionsRef = useRef({ isPlaying, lanes, beatsPerBar })
  optionsRef.current = { isPlaying, lanes, beatsPerBar }

  useEffect(() => {
    if (!enabled) return
    const kit = createDrumKit()
    kitRef.current = kit
    const transport = Tone.getTransport()
    const loop = new Tone.Loop((time: number) => {
      const { isPlaying: playing, lanes: current, beatsPerBar: perBar } = optionsRef.current
      if (!playing) return
      const step = stepAtTick(transport.getTicksAtTime(time), transport.PPQ)
      for (const part of PARTS) {
        const velocity = laneVelocity(current[part], step, perBar)
        if (velocity > 0) kit.hit(part, time, velocity)
      }
    }, '16n')
    loop.start(0)
    return () => {
      loop.dispose()
      kit.dispose()
      kitRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    kitRef.current?.setVolume(Math.max(0, volume))
  }, [volume, enabled])
}
