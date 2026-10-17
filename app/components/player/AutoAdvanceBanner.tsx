import { useEffect, useRef, useState } from 'react'
import { SkipForward, X } from 'lucide-react'

interface AutoAdvanceBannerProps {
  nextTitle: string
  delaySeconds: number
  /** Countdown reached 0, or "Ya" was pressed. */
  onAdvance: () => void
  onCancel: () => void
}

/**
 * Shown when a setlist song ends with auto-advance on: counts down the pause
 * between songs, then moves to the next one. "Ya" skips the wait.
 */
export function AutoAdvanceBanner({ nextTitle, delaySeconds, onAdvance, onCancel }: AutoAdvanceBannerProps) {
  const [remaining, setRemaining] = useState(delaySeconds)

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  // Advance once, when the countdown hits 0 (also right away for a 0 s pause).
  const hasAdvancedRef = useRef(false)
  useEffect(() => {
    if (remaining > 0 || hasAdvancedRef.current) return
    hasAdvancedRef.current = true
    onAdvance()
  }, [remaining, onAdvance])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg dark:border-slate-700 dark:bg-[#232948] dark:text-white"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate">
          Siguiente: <span className="font-semibold">{nextTitle}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Empieza en {remaining} s</p>
      </div>
      <button
        type="button"
        onClick={onAdvance}
        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
      >
        <SkipForward className="h-4 w-4" />
        Ya
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar avance automático"
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
