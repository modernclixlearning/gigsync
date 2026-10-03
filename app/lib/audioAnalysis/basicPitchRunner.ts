/**
 * basic-pitch inference (TensorFlow.js) + BPM/chord derivation.
 *
 * Heavy module: only ever imported by the analysis Web Worker, so
 * TensorFlow.js lives in the worker bundle and never in the app's chunks.
 *
 * `@spotify/basic-pitch` ships a tfjs graph model; we serve a copy from
 * `/models/basic-pitch/` (same origin, no CDN) and keep a copy in IndexedDB
 * after the first download.
 */

import * as tf from '@tensorflow/tfjs'
import { BasicPitch, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch'
import { deriveBpmAndChords } from './derive'
import type { NoteEvent } from './types'
import {
  BASIC_PITCH_SAMPLE_RATE,
  type AnalysisRunResult,
  type AnalysisStage,
  type ModelSource,
} from './workerProtocol'

export const MODEL_URL = '/models/basic-pitch/model.json'

export interface RunnerProgress {
  stage: AnalysisStage
  /** 0..1 within the stage. */
  progress: number
}

/**
 * Local copy of the model in IndexedDB. After the first successful download
 * the model loads from here with no network at all (works offline even
 * without a service worker). Bump the suffix if the model files change.
 */
const MODEL_IDB_KEY = 'indexeddb://gigsync-basic-pitch-v1'

/**
 * tfjs-core resolves its "global" as window → global → process → self. Inside
 * a worker the bundler can expose a `process`/`global` shim, so tfjs picks an
 * object without `atob` and fails decoding the model's base64 constants
 * ("Unable to decode base64 in this environment"). Point it at the real one.
 */
function ensureAtobOnTfGlobal() {
  const g = tf.env().global as { atob?: typeof atob }
  if (typeof g.atob === 'undefined' && typeof atob !== 'undefined') {
    g.atob = atob.bind(globalThis)
  }
}

let modelPromise: Promise<{ model: tf.GraphModel; source: ModelSource }> | null = null

async function loadModel(
  onProgress: (p: RunnerProgress) => void,
): Promise<{ model: tf.GraphModel; source: ModelSource }> {
  if (!modelPromise) {
    modelPromise = (async () => {
      // WebGL when available (also inside workers via OffscreenCanvas), CPU otherwise.
      try {
        if (!(await tf.setBackend('webgl'))) await tf.setBackend('cpu')
      } catch {
        await tf.setBackend('cpu')
      }
      await tf.ready()
      ensureAtobOnTfGlobal()
      try {
        const cached = await tf.loadGraphModel(MODEL_IDB_KEY)
        return { model: cached, source: 'indexeddb' as const }
      } catch {
        // not cached yet (or IndexedDB unavailable) — fetch from our own origin
      }
      const model = await tf.loadGraphModel(MODEL_URL, {
        onProgress: fraction => onProgress({ stage: 'model', progress: fraction }),
      })
      try {
        await model.save(MODEL_IDB_KEY)
      } catch {
        // private mode / quota: analysis still works, just re-downloads next time
      }
      return { model, source: 'network' as const }
    })()
    modelPromise.catch(() => {
      modelPromise = null
    })
  }
  const loaded = await modelPromise
  onProgress({ stage: 'model', progress: 1 })
  return loaded
}

export interface RunInput {
  /** Mono PCM at 22050 Hz. */
  samples: Float32Array
  beatsPerBar: number
}

export async function runAnalysis(
  { samples, beatsPerBar }: RunInput,
  onProgress: (p: RunnerProgress) => void,
): Promise<AnalysisRunResult> {
  const { model, source } = await loadModel(onProgress)
  const basicPitch = new BasicPitch(Promise.resolve(model))

  const frames: number[][] = []
  const onsets: number[][] = []
  await basicPitch.evaluateModel(
    samples,
    (f, o) => {
      frames.push(...f)
      onsets.push(...o)
    },
    p => onProgress({ stage: 'transcribe', progress: p }),
  )

  onProgress({ stage: 'derive', progress: 0 })
  // Defaults from basic-pitch's demo (onset 0.5, frame 0.3, min length 5 frames ≈ 58 ms).
  const notes: NoteEvent[] = noteFramesToTime(
    outputToNotesPoly(frames, onsets, 0.5, 0.3, 5, true, null, null, true),
  ).map(n => ({
    startTimeSeconds: n.startTimeSeconds,
    durationSeconds: n.durationSeconds,
    pitchMidi: n.pitchMidi,
    amplitude: n.amplitude,
  }))

  const result = deriveBpmAndChords({
    notes,
    durationSeconds: samples.length / BASIC_PITCH_SAMPLE_RATE,
    beatsPerBar,
    samples,
    sampleRate: BASIC_PITCH_SAMPLE_RATE,
  })
  onProgress({ stage: 'derive', progress: 1 })
  return { ...result, backend: tf.getBackend(), modelSource: source }
}
