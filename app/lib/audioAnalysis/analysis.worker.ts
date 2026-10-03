/**
 * Web Worker: runs basic-pitch + BPM/chord derivation off the main thread so
 * the UI stays responsive. Spawned (and terminated) per analysis by
 * `analyzeAudioFile`; terminating it frees the tfjs/WebGL memory.
 */

import { installWorkerShims } from './workerShims'
import { runAnalysis } from './basicPitchRunner'
import type { WorkerRequest, WorkerResponse } from './workerProtocol'

const ctx = self as unknown as {
  postMessage: (message: WorkerResponse) => void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

installWorkerShims()

ctx.onmessage = async (event) => {
  const { samples, beatsPerBar } = event.data
  try {
    const result = await runAnalysis({ samples, beatsPerBar }, p =>
      ctx.postMessage({ type: 'progress', ...p }),
    )
    ctx.postMessage({ type: 'result', result })
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
