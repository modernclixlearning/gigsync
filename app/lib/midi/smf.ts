/**
 * Standard MIDI File writer (format 1) — pure. Tracks hold events at absolute
 * ticks; the writer sorts them, turns ticks into delta times and frames the file.
 */

export const PPQ = 480

export interface SmfEvent {
  tick: number
  /** Raw event bytes (status + data, or 0xFF meta). */
  bytes: number[]
}

export interface SmfTrack {
  name: string
  events: SmfEvent[]
}

/** Variable-length quantity. */
export function vlq(value: number): number[] {
  let v = Math.max(0, Math.round(value))
  const out = [v & 0x7f]
  while ((v >>= 7) > 0) out.unshift((v & 0x7f) | 0x80)
  return out
}

const text = (s: string): number[] => [...new TextEncoder().encode(s)]
const meta = (type: number, data: number[]): number[] => [0xff, type, ...vlq(data.length), ...data]

export const tempoEvent = (tick: number, bpm: number): SmfEvent => {
  const mpqn = Math.round(60_000_000 / Math.max(1, bpm))
  return { tick, bytes: meta(0x51, [(mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff]) }
}

export const timeSignatureEvent = (tick: number, beats: number, beatUnit: number): SmfEvent => ({
  tick,
  bytes: meta(0x58, [beats, Math.round(Math.log2(beatUnit)), 24, 8]),
})

export const markerEvent = (tick: number, label: string): SmfEvent => ({ tick, bytes: meta(0x06, text(label)) })

const clamp7 = (n: number): number => Math.min(127, Math.max(0, Math.round(n)))

export function noteEvents(tick: number, durationTicks: number, channel: number, pitch: number, velocity: number): SmfEvent[] {
  const ch = channel & 0x0f
  return [
    { tick, bytes: [0x90 | ch, clamp7(pitch), Math.max(1, clamp7(velocity))] },
    { tick: tick + Math.max(1, Math.round(durationTicks)), bytes: [0x80 | ch, clamp7(pitch), 0] },
  ]
}

/** Program change: the General MIDI instrument (0-based) a channel plays. */
export const programEvent = (tick: number, channel: number, program: number): SmfEvent => ({
  tick,
  bytes: [0xc0 | (channel & 0x0f), clamp7(program)],
})

const u32 = (n: number): number[] => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
const u16 = (n: number): number[] => [(n >> 8) & 0xff, n & 0xff]

function trackChunk(track: SmfTrack): number[] {
  // Note-offs before note-ons at the same tick so repeated notes don't merge.
  const isOff = (e: SmfEvent) => (e.bytes[0] & 0xf0) === 0x80
  const sorted = [...track.events]
    .map((event, i) => ({ event, i }))
    .sort((a, b) => a.event.tick - b.event.tick || Number(isOff(b.event)) - Number(isOff(a.event)) || a.i - b.i)
    .map(({ event }) => event)
  const body: number[] = [0x00, ...meta(0x03, text(track.name))]
  let last = 0
  for (const event of sorted) {
    const tick = Math.max(last, Math.round(event.tick))
    body.push(...vlq(tick - last), ...event.bytes)
    last = tick
  }
  body.push(...vlq(0), ...meta(0x2f, []))
  return [...text('MTrk'), ...u32(body.length), ...body]
}

export function writeSmf(tracks: SmfTrack[]): Uint8Array {
  return new Uint8Array([...text('MThd'), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ), ...tracks.flatMap(trackChunk)])
}
