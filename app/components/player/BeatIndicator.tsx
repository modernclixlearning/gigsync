interface BeatIndicatorProps {
  /** Current beat within the bar (1-based for display) */
  beat: number
  /** Current bar index (0-based, converted to 1-based for display) */
  bar: number
  /** Optional total number of bars in the song */
  totalBars?: number
}

export function BeatIndicator({ beat, bar, totalBars }: BeatIndicatorProps) {
  const safeBeat = Math.max(1, Math.round(beat))
  const safeBar = Math.max(0, Math.round(bar))

  const barLabel =
    typeof totalBars === 'number' && totalBars > 0
      ? `${safeBar + 1}/${totalBars}`
      : `${safeBar + 1}`

  return (
    <div className="fixed bottom-24 right-4 z-30 bg-black/80 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-mono shadow-lg border border-indigo-500/40">
      <div className="flex items-center gap-2">
        <span className="text-indigo-300">Beat:</span>
        <span className="font-semibold">{safeBeat}</span>
        <span className="opacity-60">|</span>
        <span className="text-indigo-300">Bar:</span>
        <span className="font-semibold">{barLabel}</span>
      </div>
    </div>
  )
}

