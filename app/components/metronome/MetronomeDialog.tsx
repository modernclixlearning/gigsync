/**
 * The metronome as a modal, to open over the song player without leaving the
 * song: it starts at the song's own tempo and meter, and the tempo you end up
 * with can be saved as the song's.
 */

import { createPortal } from 'react-dom'
import { Dialog } from '~/components/layout'
import { MetronomeView } from './MetronomeView'

export interface MetronomeDialogProps {
  bpm: number
  timeSignature: string
  /** The tempo the song has saved (`bpm` may be a DAW's clock). Default: `bpm`. */
  songBpm?: number
  /** Save a tempo as the song's. Without it the dialog has no such button. */
  onApplyBpm?: (bpm: number) => void
  onClose: () => void
}

export function MetronomeDialog({ bpm, timeSignature, songBpm, onApplyBpm, onClose }: MetronomeDialogProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <Dialog title="Metrónomo" size="xl" onClose={onClose}>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        <MetronomeView
          layout="dialog"
          initialBpm={bpm}
          initialTimeSignature={timeSignature}
          songBpm={songBpm}
          onApplyBpm={onApplyBpm}
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-11 w-full shrink-0 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
      >
        Volver a la canción
      </button>
    </Dialog>,
    document.body
  )
}
