/**
 * The synths behind the band's channels (Tone.js): keyboard (stereo), bass
 * (mono) and the drum kit. Each creator returns the instrument plus a
 * `dispose` that tears down its whole chain.
 */

import * as Tone from 'tone'
import { DRUM_PAN, type BassVoice, type DrumPart, type KeysVoice } from './bandSound'

export interface ChordInstrument {
  synth: Tone.PolySynth
  dispose: () => void
}

const KEYS_SETTINGS: Record<KeysVoice, { voice: typeof Tone.Synth | typeof Tone.FMSynth; options: object }> = {
  piano: {
    voice: Tone.Synth,
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.35, release: 0.5 } },
  },
  epiano: {
    voice: Tone.FMSynth,
    options: {
      harmonicity: 3,
      modulationIndex: 1.5,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.25, release: 0.6 },
      modulationEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.4 },
    },
  },
  organ: {
    voice: Tone.Synth,
    options: { oscillator: { type: 'fatsquare', count: 2, spread: 8 }, envelope: { attack: 0.02, decay: 0.05, sustain: 0.85, release: 0.12 } },
  },
  pad: {
    voice: Tone.Synth,
    options: { oscillator: { type: 'fatsawtooth', count: 3, spread: 25 }, envelope: { attack: 0.35, decay: 0.3, sustain: 0.7, release: 1.2 } },
  },
}

const BASS_SETTINGS: Record<BassVoice, object> = {
  sub: { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.9, release: 0.25 } },
  electric: { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.5, sustain: 0.45, release: 0.3 } },
  synth: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.2 } },
}

/** Keyboard: the whole chord, spread over the stereo field by a chorus. */
export function createKeysInstrument(voice: KeysVoice): ChordInstrument {
  const { voice: Voice, options } = KEYS_SETTINGS[voice]
  const synth = new Tone.PolySynth(Voice as typeof Tone.Synth, options)
  synth.maxPolyphony = 24
  const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.5, depth: 0.7, wet: voice === 'pad' ? 0.7 : 0.5 }).start()
  synth.connect(chorus)
  chorus.toDestination()
  return {
    synth,
    dispose: () => {
      synth.releaseAll()
      synth.dispose()
      chorus.dispose()
    },
  }
}

/** Bass: one note at a time, summed to mono and kept in the centre. */
export function createBassInstrument(voice: BassVoice): ChordInstrument {
  const synth = new Tone.PolySynth(Tone.Synth, BASS_SETTINGS[voice])
  synth.maxPolyphony = 4
  const filter = new Tone.Filter({ type: 'lowpass', frequency: voice === 'synth' ? 900 : 2000, rolloff: -12 })
  const mono = new Tone.Mono()
  synth.connect(filter)
  filter.connect(mono)
  mono.toDestination()
  return {
    synth,
    dispose: () => {
      synth.releaseAll()
      synth.dispose()
      filter.dispose()
      mono.dispose()
    },
  }
}

export interface DrumKit {
  hit: (part: DrumPart, time: number, velocity: number) => void
  setVolume: (gain: number) => void
  dispose: () => void
}

/** Mini drum machine: synthesised kick, snare and hi-hat into one bus. */
export function createDrumKit(): DrumKit {
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

  return {
    hit(part, time, velocity) {
      if (part === 'kick') kick.triggerAttackRelease('C1', '8n', time, velocity)
      else if (part === 'snare') snare.triggerAttackRelease('16n', time, velocity)
      else hat.triggerAttackRelease('32n', time, velocity * 0.6)
    },
    setVolume(gain) {
      bus.gain.value = Math.max(0, gain)
    },
    dispose() {
      ;[kick, snare, hat, snareFilter, hatFilter, bus, ...Object.values(panners)].forEach((node) => node.dispose())
    },
  }
}
