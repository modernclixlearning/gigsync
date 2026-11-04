/**
 * The player's «band» (pure data): the sound choices of the keyboard and the
 * bass, and the rhythm patterns of the mini drum machine.
 *
 * Channels and where they sit in the stereo mix:
 *  - Bajo: the root note only, mono, dead centre.
 *  - Teclado: the full chord, stereo (a chorus spreads it left/right).
 *  - Batería: kick and snare centre, hi-hat a little to the right.
 *  - Metrónomo: the click (see useMetronomeSound), centre.
 */

export const KEYS_VOICES = ['piano', 'epiano', 'organ', 'pad'] as const
export type KeysVoice = (typeof KEYS_VOICES)[number]

export const BASS_VOICES = ['sub', 'electric', 'synth'] as const
export type BassVoice = (typeof BASS_VOICES)[number]

export const DRUM_PATTERNS = ['rock', 'pop', 'ballad', 'bossa'] as const
export type DrumPattern = (typeof DRUM_PATTERNS)[number]

export const DEFAULT_KEYS_VOICE: KeysVoice = 'piano'
export const DEFAULT_BASS_VOICE: BassVoice = 'electric'
export const DEFAULT_DRUM_PATTERN: DrumPattern = 'rock'

export const KEYS_VOICE_LABELS: Record<KeysVoice, string> = {
  piano: 'Piano',
  epiano: 'Piano eléctrico',
  organ: 'Órgano',
  pad: 'Pad',
}

export const BASS_VOICE_LABELS: Record<BassVoice, string> = {
  sub: 'Sub (redondo)',
  electric: 'Eléctrico',
  synth: 'Sintetizador',
}

export const DRUM_PATTERN_LABELS: Record<DrumPattern, string> = {
  rock: 'Rock',
  pop: 'Pop (bombo a negras)',
  ballad: 'Balada',
  bossa: 'Bossa nova',
}

/** Steps per quarter note in the patterns (16th notes). */
export const STEPS_PER_BEAT = 4

export type DrumPart = 'kick' | 'snare' | 'hat'

/** One bar of 4/4 in 16th notes: 0 = rest, otherwise the hit's velocity (0–1). */
export type DrumLane = readonly number[]
export type DrumPatternDef = Record<DrumPart, DrumLane>

const steps = (pattern: string, velocities: Record<string, number>): number[] =>
  [...pattern.replace(/\s/g, '')].map((c) => velocities[c] ?? 0)

const HIT = { X: 1, x: 0.7, o: 0.45 }

export const DRUM_PATTERN_DEFS: Record<DrumPattern, DrumPatternDef> = {
  // 1 and 3&-ish kick, snare on 2 and 4, straight eighth hats.
  rock: {
    kick: steps('X... .... X.X. ....', HIT),
    snare: steps('.... X... .... X...', HIT),
    hat: steps('X.x. x.x. x.x. x.x.', HIT),
  },
  // Four on the floor, snare on 2 and 4, hats on the off-beats.
  pop: {
    kick: steps('X... X... X... X...', HIT),
    snare: steps('.... X... .... X...', HIT),
    hat: steps('..x. ..x. ..x. ..x.', HIT),
  },
  // Slow: kick on 1 and 3, soft snare on 2 and 4, quiet quarter hats.
  ballad: {
    kick: steps('X... .... x... ....', HIT),
    snare: steps('.... x... .... x...', HIT),
    hat: steps('o... o... o... o...', HIT),
  },
  // Bossa: steady bass-drum pulse, cross-stick on the 3-2 clave, eighth hats.
  bossa: {
    kick: steps('X... ..x. X... ..x.', HIT),
    snare: steps('X..x ..x. ..x. x...', { ...HIT, X: 0.5, x: 0.55 }),
    hat: steps('x.x. x.x. x.x. x.x.', HIT),
  },
}

/** Velocity (0–1) of a drum part at a 16th-note step, 0 when it rests. */
export function drumVelocity(pattern: DrumPattern, part: DrumPart, step: number, beatsPerBar: number): number {
  const stepsPerBar = Math.max(1, Math.round(beatsPerBar)) * STEPS_PER_BEAT
  const inBar = ((Math.round(step) % stepsPerBar) + stepsPerBar) % stepsPerBar
  const lane = DRUM_PATTERN_DEFS[pattern][part]
  return lane[inBar % lane.length] ?? 0
}

/** Pan (-1 left … 1 right) of each drum part. */
export const DRUM_PAN: Record<DrumPart, number> = { kick: 0, snare: 0, hat: 0.3 }
