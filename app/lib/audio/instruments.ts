/**
 * The instruments behind the band's channels (Tone.js): keyboard (stereo),
 * bass (mono) and the drum kit. Piano, organ, electric bass and the drums are
 * recorded samples (public/samples, cached for offline use); until a sample
 * set has loaded (or if it never does) a synth plays in its place, so a
 * channel is never silent. The other voices are synthesised. Each creator
 * returns the instrument plus a `dispose` that tears down its whole chain.
 */

import * as Tone from 'tone'
import { DRUM_PAN, type BassVoice, type DrumPart, type KeysVoice } from './bandSound'
import { setSoundStatus, type BandChannel } from './soundStatus'
import type { TrackVoice } from './bandTracks'

/** What the chord hook needs from a channel: play notes, silence them, set the level. */
export interface PlayableVoice {
  triggerAttackRelease: (notes: number[], duration: number, time?: number, velocity?: number) => void
  /** Key down / key up, for instruments played live. */
  triggerAttack: (notes: number[], time?: number, velocity?: number) => void
  triggerRelease: (notes: number[], time?: number) => void
  releaseAll: () => void
  volume: { value: number }
}

export interface ChordInstrument {
  synth: PlayableVoice
  dispose: () => void
}

const SAMPLE_BASE = '/samples'

/** Note names Tone understands → the file that holds them (`Ds2.mp3` for D#2). */
function sampleUrls(notes: string[]): Record<string, string> {
  return Object.fromEntries(notes.map((note) => [note.replace('s', '#'), `${note}.mp3`]))
}

const KEYS_SAMPLES: Partial<Record<KeysVoice, { dir: string; notes: string[]; release: number }>> = {
  piano: {
    dir: 'piano',
    notes: ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6'],
    release: 1,
  },
}

const BASS_SAMPLES: Partial<Record<BassVoice, { dir: string; notes: string[]; release: number }>> = {
  electric: { dir: 'bass', notes: ['E1', 'As1', 'E2', 'As2', 'E3'], release: 0.3 },
  upright: { dir: 'upright', notes: ['Fs1', 'C2', 'E2', 'Gs2', 'E3'], release: 0.3 },
}

/** A plain synth channel, its level on the shared volume node. */
function synthVoice(synth: Tone.PolySynth, volume: Tone.Volume): PlayableVoice {
  return {
    triggerAttackRelease: (notes, duration, time, velocity) => synth.triggerAttackRelease(notes, duration, time, velocity),
    triggerAttack: (notes, time, velocity) => synth.triggerAttack(notes, time, velocity),
    triggerRelease: (notes, time) => synth.triggerRelease(notes, time),
    releaseAll: () => synth.releaseAll(),
    get volume() {
      return volume.volume
    },
  }
}

/**
 * A sampler with a synth behind it: plays the samples once they are loaded and
 * the synth until then. Both feed `output`, which carries the channel level.
 */
function sampledVoice(
  synth: Tone.PolySynth,
  spec: { dir: string; notes: string[]; release: number },
  output: Tone.ToneAudioNode,
  volume: Tone.Volume,
  channel: BandChannel,
  report = true,
): { voice: PlayableVoice; sampler: Tone.Sampler; stop: () => void } {
  let alive = true
  const status = (value: Parameters<typeof setSoundStatus>[1]) => report && setSoundStatus(channel, value)
  status('loading')
  const sampler = new Tone.Sampler({
    urls: sampleUrls(spec.notes),
    baseUrl: `${SAMPLE_BASE}/${spec.dir}/`,
    release: spec.release,
    onload: () => alive && status('samples'),
    onerror: () => alive && status('failed'), // stays on the synth fallback
  })
  sampler.connect(output)
  const active = () => (sampler.loaded ? sampler : synth)
  return {
    sampler,
    stop: () => {
      alive = false
      status('idle')
    },
    voice: {
      triggerAttackRelease: (notes, duration, time, velocity) => active().triggerAttackRelease(notes, duration, time, velocity),
      triggerAttack: (notes, time, velocity) => active().triggerAttack(notes, time, velocity),
      // Release on both: the key may have been struck while the other one was active.
      triggerRelease: (notes, time) => {
        sampler.triggerRelease(notes, time)
        synth.triggerRelease(notes, time)
      },
      releaseAll: () => {
        sampler.releaseAll()
        synth.releaseAll()
      },
      get volume() {
        return volume.volume
      },
    },
  }
}

const KEYS_SETTINGS: Record<KeysVoice, { voice: typeof Tone.Synth | typeof Tone.FMSynth; options: object }> = {
  piano: {
    voice: Tone.Synth,
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.35, release: 0.5 } },
  },
}

const BASS_SETTINGS: Record<BassVoice, object> = {
  // Stand-ins while the recorded bass loads (or if it cannot).
  electric: { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.45, release: 0.3 } },
  upright: { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.4, sustain: 0.6, release: 0.3 } },
}

/** Keyboard: the whole chord, spread over the stereo field by a chorus. */
export function createKeysInstrument(voice: KeysVoice, { reportStatus = true }: { reportStatus?: boolean } = {}): ChordInstrument {
  const { voice: Voice, options } = KEYS_SETTINGS[voice]
  const synth = new Tone.PolySynth(Voice as typeof Tone.Synth, options)
  synth.maxPolyphony = 24
  const sampled = KEYS_SAMPLES[voice]
  // The chorus only dresses the synthesised voices (and the synth standing in while samples load).
  const chorus = new Tone.Chorus({
    frequency: 1.2,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.5,
  }).start()
  const level = new Tone.Volume(0)
  synth.connect(chorus)
  chorus.connect(level)
  level.toDestination()
  // Recorded keys skip the chorus: it modulates the pitch and a piano sounds out of tune.
  const playable = sampled ? sampledVoice(synth, sampled, level, level, 'keys', reportStatus) : null
  if (!sampled && reportStatus) setSoundStatus('keys', 'synth')
  return {
    synth: playable?.voice ?? synthVoice(synth, level),
    dispose: () => {
      synth.releaseAll()
      playable?.sampler.releaseAll()
      synth.dispose()
      playable?.sampler.dispose()
      playable?.stop()
      if (!playable && reportStatus) setSoundStatus('keys', 'idle')
      chorus.dispose()
      level.dispose()
    },
  }
}

/** Bass: one note at a time, summed to mono and kept in the centre. */
export function createBassInstrument(voice: BassVoice, { reportStatus = true }: { reportStatus?: boolean } = {}): ChordInstrument {
  const synth = new Tone.PolySynth(Tone.Synth, BASS_SETTINGS[voice])
  synth.maxPolyphony = 4
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 2000, rolloff: -12 })
  const mono = new Tone.Mono()
  const level = new Tone.Volume(0)
  synth.connect(filter)
  filter.connect(mono)
  mono.connect(level)
  level.toDestination()
  const sampled = BASS_SAMPLES[voice]
  // The recorded bass skips the synth's low-pass: it is already a bass.
  const playable = sampled ? sampledVoice(synth, sampled, mono, level, 'bass', reportStatus) : null
  if (!sampled && reportStatus) setSoundStatus('bass', 'synth')
  return {
    synth: playable?.voice ?? synthVoice(synth, level),
    dispose: () => {
      synth.releaseAll()
      playable?.sampler.releaseAll()
      synth.dispose()
      playable?.sampler.dispose()
      playable?.stop()
      if (!playable && reportStatus) setSoundStatus('bass', 'idle')
      filter.dispose()
      mono.dispose()
      level.dispose()
    },
  }
}

export interface DrumKit {
  hit: (part: DrumPart, time: number, velocity: number) => void
  setVolume: (gain: number) => void
  dispose: () => void
}

const DRUM_FILES: Record<DrumPart, string> = { kick: 'kick.mp3', snare: 'snare.mp3', hat: 'hihat.mp3' }

/**
 * Mini drum machine: recorded kick, snare and hi-hat (an acoustic kit) into one
 * bus; a hit falls back to a synthesised drum while its sample is not loaded.
 */
export function createDrumKit({ reportStatus = true }: { reportStatus?: boolean } = {}): DrumKit {
  const status = (value: Parameters<typeof setSoundStatus>[1]) => reportStatus && setSoundStatus('drums', value)
  const bus = new Tone.Gain(0.5).toDestination()
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
  })
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 },
  })
  const snareFilter = new Tone.Filter({ type: 'bandpass', frequency: 2200, Q: 0.7 })
  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.01 },
  })
  const hatFilter = new Tone.Filter({ type: 'highpass', frequency: 7500 })
  const panners = {
    kick: new Tone.Panner(DRUM_PAN.kick),
    snare: new Tone.Panner(DRUM_PAN.snare),
    hat: new Tone.Panner(DRUM_PAN.hat),
  }
  kick.connect(panners.kick)
  snare.connect(snareFilter)
  snareFilter.connect(panners.snare)
  hat.connect(hatFilter)
  hatFilter.connect(panners.hat)
  Object.values(panners).forEach((panner) => panner.connect(bus))

  let alive = true
  let pending = Object.keys(DRUM_FILES).length
  status('loading')
  const players = Object.fromEntries(
    (Object.keys(DRUM_FILES) as DrumPart[]).map((part) => {
      const player = new Tone.Player({
        url: `${SAMPLE_BASE}/drums/${DRUM_FILES[part]}`,
        onload: () => {
          pending -= 1
          if (alive && pending === 0) status('samples')
        },
        onerror: () => alive && status('failed'),
      })
      player.connect(panners[part])
      return [part, player]
    }),
  ) as Record<DrumPart, Tone.Player>

  return {
    hit(part, time, velocity) {
      const player = players[part]
      if (player.loaded) {
        player.volume.setValueAtTime(Tone.gainToDb(Math.max(0.0001, velocity)), time)
        player.start(time)
      } else if (part === 'kick') kick.triggerAttackRelease('C1', '8n', time, velocity)
      else if (part === 'snare') snare.triggerAttackRelease('16n', time, velocity)
      else hat.triggerAttackRelease('32n', time, velocity * 0.6)
    },
    setVolume(gain) {
      bus.gain.value = Math.max(0, gain)
    },
    dispose() {
      alive = false
      status('idle')
      ;[
        kick, snare, hat, snareFilter, hatFilter, bus,
        ...Object.values(panners),
        ...Object.values(players),
      ].forEach((node) => node.dispose())
    },
  }
}

/* ── Written tracks: lead melody and arrangement ─────────────────────────── */

interface TrackVoiceSpec {
  /** Options of the Tone.Synth behind each voice of the PolySynth. */
  synth: object
  polyphony: number
  /** Trim in dB, so the six voices sit at a similar loudness. */
  trim: number
  /** Effects between the synth and the channel level, in order. */
  chain: () => Tone.ToneAudioNode[]
}

/**
 * All six are synthesised (no samples yet): each is an oscillator shape, an
 * envelope and a short chain that give it the character of the instrument.
 */
const TRACK_VOICE_SPECS: Record<TrackVoice, TrackVoiceSpec> = {
  // Synth lead: bright, immediate, a touch of chorus.
  leadKeys: {
    synth: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.25 },
    },
    polyphony: 8,
    trim: -12,
    chain: () => [
      new Tone.Filter({ type: 'lowpass', frequency: 3800, rolloff: -12 }),
      new Tone.Chorus({ frequency: 0.8, delayTime: 3, depth: 0.4, wet: 0.3 }).start(),
    ],
  },
  // Electric guitar: overdriven, then a low-pass standing in for the speaker.
  guitar: {
    synth: {
      oscillator: { type: 'fatsawtooth', count: 2, spread: 8 },
      envelope: { attack: 0.004, decay: 0.7, sustain: 0.45, release: 0.35 },
    },
    polyphony: 6,
    trim: -16,
    chain: () => [
      new Tone.Distortion({ distortion: 0.45, wet: 0.8 }),
      new Tone.Filter({ type: 'lowpass', frequency: 3200, rolloff: -24 }),
    ],
  },
  // Sax: a reedy pulse that speaks a little late, with vibrato.
  sax: {
    synth: {
      oscillator: { type: 'pulse', width: 0.35 },
      envelope: { attack: 0.045, decay: 0.15, sustain: 0.8, release: 0.2 },
    },
    polyphony: 4,
    trim: -14,
    chain: () => [
      new Tone.Vibrato({ frequency: 5.2, depth: 0.08 }),
      new Tone.Filter({ type: 'lowpass', frequency: 2200, rolloff: -12, Q: 1.5 }),
    ],
  },
  // Strings: slow bow, wide ensemble.
  strings: {
    synth: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 28 },
      envelope: { attack: 0.22, decay: 0.3, sustain: 0.85, release: 0.9 },
    },
    polyphony: 12,
    trim: -16,
    chain: () => [
      new Tone.Filter({ type: 'lowpass', frequency: 2600, rolloff: -12 }),
      new Tone.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.6, wet: 0.5 }).start(),
    ],
  },
  // Brass section: a quick swell, darker than the strings.
  brass: {
    synth: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.06, decay: 0.25, sustain: 0.75, release: 0.3 },
    },
    polyphony: 8,
    trim: -13,
    chain: () => [new Tone.Filter({ type: 'lowpass', frequency: 1900, rolloff: -12, Q: 1 })],
  },
  // Choir: soft «ah» — a band-pass around the vowel's formant, slow in and out.
  choir: {
    synth: {
      oscillator: { type: 'fattriangle', count: 3, spread: 22 },
      envelope: { attack: 0.3, decay: 0.3, sustain: 0.9, release: 1.1 },
    },
    polyphony: 12,
    trim: -8,
    chain: () => [
      new Tone.Filter({ type: 'bandpass', frequency: 850, Q: 0.6 }),
      new Tone.Chorus({ frequency: 0.5, delayTime: 5, depth: 0.7, wet: 0.6 }).start(),
    ],
  },
}

/** A written track's instrument: lead keys, electric guitar, sax, strings, brass or choir. */
export function createTrackInstrument(voice: TrackVoice): ChordInstrument {
  const spec = TRACK_VOICE_SPECS[voice]
  const synth = new Tone.PolySynth(Tone.Synth, spec.synth)
  synth.maxPolyphony = spec.polyphony
  synth.volume.value = spec.trim
  const chain = spec.chain()
  const level = new Tone.Volume(0)
  let node: Tone.ToneAudioNode = synth
  for (const next of chain) {
    node.connect(next)
    node = next
  }
  node.connect(level)
  level.toDestination()
  return {
    synth: synthVoice(synth, level),
    dispose: () => {
      synth.releaseAll()
      synth.dispose()
      chain.forEach((effect) => effect.dispose())
      level.dispose()
    },
  }
}
