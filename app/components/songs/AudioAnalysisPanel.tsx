import { useEffect, useRef, useState } from 'react'
import { AudioLines, Loader2, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  beatsPerBarFromTimeSignature,
  buildDetectedSection,
  DETECTED_SECTION_NAME,
  parseBarText,
  progressionToBarLines,
} from '~/lib/audioAnalysis/chordproOutput'
import type { AnalysisRunResult } from '~/lib/audioAnalysis/workerProtocol'
// Type-only: the analysis module (and TensorFlow.js behind it) is loaded with a
// dynamic import when the user starts an analysis.
import type { AnalyzeProgress } from '~/lib/audioAnalysis/analyzeAudioFile'

export interface AudioAnalysisApply {
  /** New BPM, when the user chose to apply it. */
  bpm?: number
  /** ChordPro section to append to the lyrics, when chosen. */
  section?: string
}

interface AudioAnalysisPanelProps {
  timeSignature: string
  currentBpm: number
  onApply: (changes: AudioAnalysisApply) => void
  onClose: () => void
}

type Status = 'idle' | 'running' | 'review' | 'error'

const STAGE_LABEL: Record<AnalyzeProgress['stage'], string> = {
  decode: 'Decodificando audio…',
  model: 'Cargando modelo de transcripción…',
  transcribe: 'Transcribiendo notas…',
  derive: 'Calculando BPM y acordes…',
}

const inputClass = cn(
  'w-full px-4 py-3 rounded-xl',
  'bg-white dark:bg-[#1a1f36]',
  'border border-slate-200 dark:border-slate-700',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500',
)

const clampBpm = (n: number) => Math.min(300, Math.max(20, Math.round(n)))

/**
 * Detect BPM and a chord progression from a local reference audio file,
 * entirely in the browser (basic-pitch via TensorFlow.js in a Web Worker),
 * then let the user review/edit before anything touches the song.
 */
export function AudioAnalysisPanel({ timeSignature, currentBpm, onApply, onClose }: AudioAnalysisPanelProps) {
  const beatsPerBar = beatsPerBarFromTimeSignature(timeSignature)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisRunResult | null>(null)

  const [bpm, setBpm] = useState<number>(currentBpm)
  const [applyBpm, setApplyBpm] = useState(true)
  const [barText, setBarText] = useState('')
  const [applyChords, setApplyChords] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleAnalyze = async () => {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('running')
    setError(null)
    setProgress({ stage: 'decode', progress: 0 })
    try {
      const { analyzeAudioFile } = await import('~/lib/audioAnalysis/analyzeAudioFile')
      const res = await analyzeAudioFile(file, {
        beatsPerBar,
        onProgress: setProgress,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setResult(res)
      setBpm(res.bpm ? clampBpm(res.bpm) : currentBpm)
      setApplyBpm(res.bpm !== null)
      const lines = progressionToBarLines(res.progression)
      setBarText(lines.join('\n'))
      setApplyChords(lines.length > 0)
      setStatus('review')
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setProgress(null)
  }

  const parsedBars = parseBarText(barText, beatsPerBar)
  const chordsInvalid = applyChords && (parsedBars.invalidLines.length > 0 || parsedBars.lines.length === 0)
  const nothingToApply = !applyBpm && !applyChords

  const handleApply = () => {
    if (chordsInvalid || nothingToApply) return
    onApply({
      bpm: applyBpm ? clampBpm(bpm) : undefined,
      section: applyChords ? buildDetectedSection(parsedBars.lines, parsedBars.barCount) : undefined,
    })
  }

  const percent = progress ? Math.round(progress.progress * 100) : 0

  return (
    <section
      aria-label="Detectar acordes y BPM desde audio"
      className="mb-4 p-4 rounded-xl bg-white dark:bg-[#1a1f36] border border-slate-200 dark:border-slate-700 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <AudioLines className="w-4 h-4 text-indigo-500" />
            Detectar acordes y BPM desde audio
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Elegí la pista de referencia. Se analiza en este dispositivo: el audio no se sube ni se guarda.
            El resultado es aproximado y lo revisás antes de aplicarlo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            handleCancel()
            onClose()
          }}
          aria-label="Cerrar"
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {(status === 'idle' || status === 'error') && (
        <div className="space-y-3">
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
            aria-label="Archivo de audio"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className={cn(
              'block w-full text-sm text-slate-600 dark:text-slate-300',
              'file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0',
              'file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200',
              'file:font-medium hover:file:bg-slate-200 dark:hover:file:bg-slate-700',
            )}
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!file}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm',
              'bg-indigo-500 text-white hover:bg-indigo-600',
              'disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
              'transition-colors',
            )}
          >
            Analizar
          </button>
        </div>
      )}

      {status === 'running' && progress && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              {STAGE_LABEL[progress.stage]}
            </span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          {progress.stage === 'model' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La primera vez se descarga el modelo (~1 MB); después queda en caché y funciona sin conexión.
            </p>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === 'review' && result && (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <input type="checkbox" checked={applyBpm} onChange={e => setApplyBpm(e.target.checked)} />
              Aplicar BPM <span className="font-normal text-slate-400">(actual: {currentBpm})</span>
            </label>
            {result.bpm === null ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No se pudo estimar el tempo.</p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  aria-label="BPM detectado"
                  value={bpm}
                  min={20}
                  max={300}
                  onChange={e => setBpm(parseInt(e.target.value) || bpm)}
                  className={cn(inputClass, 'w-28')}
                />
                <button
                  type="button"
                  onClick={() => setBpm(b => clampBpm(b / 2))}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
                  title="Mitad del tempo"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => setBpm(b => clampBpm(b * 2))}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
                  title="Doble del tempo"
                >
                  ×2
                </button>
                <span className="text-xs text-slate-400">detectado: {result.bpm}</span>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <input
                type="checkbox"
                checked={applyChords}
                onChange={e => setApplyChords(e.target.checked)}
              />
              Agregar progresión como sección «{DETECTED_SECTION_NAME}»
            </label>
            {result.progression.bars.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No se detectaron acordes.</p>
            ) : null}
            <textarea
              aria-label="Progresión detectada"
              value={barText}
              onChange={e => setBarText(e.target.value)}
              rows={Math.min(12, Math.max(3, barText.split('\n').length + 1))}
              placeholder="Am | G | C | F |"
              className={cn(inputClass, 'font-mono text-sm resize-y')}
            />
            {applyChords && parsedBars.invalidLines.length > 0 && (
              <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                Líneas no válidas: {parsedBars.invalidLines.join(', ')}. Usá el formato «Am | G 2 | C 2 |».
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Un compás por celda ({beatsPerBar} tiempos; «G 2» = medio compás). La letra existente no se
              modifica: la progresión se agrega al final como sección propia, para moverla o copiarla en el
              editor de compases.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            {result.noteCount} notas transcritas · {Math.round(result.durationSeconds)} s · motor {result.backend}
            {result.modelSource === 'indexeddb' ? ' · modelo en caché local' : ' · modelo descargado y guardado'}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={chordsInvalid || nothingToApply}
              className={cn(
                'flex-1 py-3 rounded-xl font-semibold text-sm',
                'bg-indigo-500 text-white hover:bg-indigo-600',
                'disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
                'transition-colors',
              )}
            >
              Aplicar a la canción
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setStatus('idle')
              }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
