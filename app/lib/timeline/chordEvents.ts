/**
 * The song's chords as timed events (pure): every chord cell of the timeline
 * with the beat it starts on and how many beats it lasts — the same timing the
 * player highlights.
 */

import type { SongTimeline, TimelineElement } from '~/types/timeline'

export interface ChordEvent {
  chord: string
  startBeat: number
  durationBeats: number
}

/**
 * Beats of each chord cell of a timeline element, in the order they are drawn
 * (an instrumental's ×N repeats included). Lyric lines use their explicit
 * beats when every chord has them, otherwise the line is split evenly.
 */
export function chordCellBeats(element: TimelineElement, beatsPerBar: number): number[] {
  const content = element.content
  if (!content || !('type' in content)) return []
  if (content.type === 'instrumental') {
    const { chordBars, repeatCount } = content.section
    const base = chordBars.map((b) => b.beats ?? beatsPerBar)
    return Array.from({ length: repeatCount ?? 1 }, () => base).flat()
  }
  if (content.type === 'chords-only') return content.chordBars.map((b) => b.beats ?? beatsPerBar)
  if (content.type === 'lyric') {
    const { chords } = content
    if (chords.length === 0) return []
    if (chords.every((c) => c.beats !== undefined)) return chords.map((c) => c.beats!)
    return chords.map(() => element.durationBeats / chords.length)
  }
  return []
}

/** Chord names of an element's cells, in the order chordCellBeats times them. */
function cellChords(element: TimelineElement): string[] {
  const content = element.content
  if (!content || !('type' in content)) return []
  if (content.type === 'instrumental') {
    const { chordBars, repeatCount } = content.section
    const base = chordBars.map((bar) => bar.chord)
    return Array.from({ length: repeatCount ?? 1 }, () => base).flat()
  }
  if (content.type === 'chords-only') return content.chordBars.map((bar) => bar.chord)
  if (content.type === 'lyric') return content.chords.map((c) => c.chord)
  return []
}

export function chordEvents(timeline: SongTimeline | null): ChordEvent[] {
  if (!timeline) return []
  const events: ChordEvent[] = []
  for (const element of timeline.elements) {
    const beats = chordCellBeats(element, timeline.beatsPerBar)
    const chords = cellChords(element)
    let beat = element.startBeat
    beats.forEach((durationBeats, i) => {
      const chord = chords[i]?.trim()
      if (chord && durationBeats > 0) events.push({ chord, startBeat: beat, durationBeats })
      beat += durationBeats
    })
  }
  return events
}

/** The event sounding at `beat` (start inclusive), or null. */
export function chordEventAt(events: ChordEvent[], beat: number): ChordEvent | null {
  for (const event of events) {
    if (beat >= event.startBeat && beat < event.startBeat + event.durationBeats) return event
  }
  return null
}
