/**
 * Main-thread entry point of the audio analysis: decode a local file with
 * Web Audio, downmix + resample to 22.05 kHz mono (what basic-pitch expects),
 * and hand the PCM to a Web Worker that runs the model.
 *
 * Decoding has to happen here: `AudioContext`/`OfflineAudioContext` don't
 * exist inside workers. Nothing is uploaded or persisted — the file only lives
 * in memory for the duration of the analysis.
 */

import {
  BASIC_PITCH_SAMPLE_RATE,
  type AnalysisRunResult,
  type AnalysisStage,
  type WorkerRequest,
  type WorkerResponse,
} from './workerProtocol'

export type AnalyzeStage = 'decode' | AnalysisStage

export interface AnalyzeProgress {
  stage: AnalyzeStage
  /** 0..1 within the stage. */
  progress: number
}

export interface AnalyzeOptions {
  beatsPerBar: number
  onProgress?: (p: AnalyzeProgress) => void
  signal?: AbortSignal
}

/** Longer files are rejected: analysis time and memory grow linearly. */
export const MAX_ANALYSIS_SECONDS = 10 * 60

export class AnalysisAbortedError extends Error {
  constructor() {
    super('Análisis cancelado')
    this.name = 'AnalysisAbortedError'
  }
}

type AudioContextCtor = typeof AudioContext

async function decodeToMono22k(file: Blob): Promise<Float32Array> {
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor || typeof OfflineAudioContext === 'undefined') {
    throw new Error('Este navegador no soporta Web Audio.')
  }
  const bytes = await file.arrayBuffer()
  const ctx = new Ctor()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(bytes)
  } catch {
    throw new Error('No se pudo decodificar el archivo de audio (formato no soportado por el navegador).')
  } finally {
    void ctx.close()
  }
  if (decoded.duration > MAX_ANALYSIS_SECONDS) {
    throw new Error(`El audio dura más de ${MAX_ANALYSIS_SECONDS / 60} minutos.`)
  }
  // Rendering into a 1-channel context downmixes; the context rate resamples.
  const length = Math.max(1, Math.ceil(decoded.duration * BASIC_PITCH_SAMPLE_RATE))
  const offline = new OfflineAudioContext(1, length, BASIC_PITCH_SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  // Copy so the buffer can be transferred to the worker (AudioBuffer-backed
  // memory isn't guaranteed to be detachable).
  return new Float32Array(rendered.getChannelData(0))
}

function runInWorker(
  request: WorkerRequest,
  onProgress: (p: AnalyzeProgress) => void,
  signal?: AbortSignal,
): Promise<AnalysisRunResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => {
      worker.terminate()
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(new AnalysisAbortedError())
    }
    signal?.addEventListener('abort', onAbort)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.type === 'progress') {
        onProgress({ stage: msg.stage, progress: msg.progress })
      } else if (msg.type === 'result') {
        cleanup()
        resolve(msg.result)
      } else {
        cleanup()
        reject(new Error(msg.message))
      }
    }
    worker.onerror = (event) => {
      cleanup()
      reject(new Error(event.message || 'Error en el worker de análisis'))
    }
    worker.postMessage(request, [request.samples.buffer])
  })
}

/** Analyze a local audio file: BPM + bar-level chord progression. */
export async function analyzeAudioFile(
  file: Blob,
  { beatsPerBar, onProgress = () => {}, signal }: AnalyzeOptions,
): Promise<AnalysisRunResult> {
  onProgress({ stage: 'decode', progress: 0 })
  const samples = await decodeToMono22k(file)
  if (signal?.aborted) throw new AnalysisAbortedError()
  onProgress({ stage: 'decode', progress: 1 })

  if (typeof Worker === 'undefined') {
    // No main-thread fallback on purpose: it would duplicate TensorFlow.js in a
    // second chunk and freeze the UI for the whole inference.
    throw new Error('Este navegador no soporta Web Workers, necesarios para el análisis.')
  }
  return runInWorker({ samples, beatsPerBar }, onProgress, signal)
}
