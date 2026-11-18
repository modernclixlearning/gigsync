/**
 * The tuner as a modal, to open over the song player without leaving the song:
 * the song, the setlist and the place in it stay exactly where they are.
 */

import { createPortal } from 'react-dom'
import { Dialog } from '~/components/layout'
import { TunerView } from './TunerView'

export function TunerDialog({ onClose }: { onClose: () => void }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <Dialog title="Afinador" size="xl" onClose={onClose}>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        <TunerView layout="dialog" />
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
