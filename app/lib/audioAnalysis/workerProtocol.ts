import type { AudioAnalysisResult } from './types'

/** basic-pitch expects mono audio at this rate. */
export const BASIC_PITCH_SAMPLE_RATE = 22050

export type AnalysisStage = 'model' | 'transcribe' | 'derive'

/** Where the model came from: local IndexedDB copy or a fresh download. */
export type ModelSource = 'indexeddb' | 'network'

export type AnalysisRunResult = AudioAnalysisResult & {
  /** tfjs backend actually used ('webgl' | 'cpu'). */
  backend: string
  modelSource: ModelSource
}

export interface WorkerRequest {
  /** Mono PCM at 22050 Hz (transferred, not copied). */
  samples: Float32Array
  beatsPerBar: number
}

export type WorkerResponse =
  | { type: 'progress'; stage: AnalysisStage; progress: number }
  | { type: 'result'; result: AnalysisRunResult }
  | { type: 'error'; message: string }
