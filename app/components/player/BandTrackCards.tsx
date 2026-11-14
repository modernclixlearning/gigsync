/**
 * The song's written tracks in the «Sonido» tab: one card for the lead melody
 * and one for the arrangement, each with its sound, its level, whether it
 * plays, and the way into the full-screen editor where it is written.
 */

import { FilePenLine, Volume2, VolumeX } from 'lucide-react'
import { cn } from '~/lib/utils'
import { cleanSongBand, type SongBand } from '~/lib/audio/bandPatterns'
import {
  TRACK_ROLES,
  TRACK_ROLE_LABELS,
  TRACK_VOICE_LABELS,
  trackVoice,
  trackVolume,
  type BandTrack,
  type TrackRole,
} from '~/lib/audio/bandTracks'

export interface BandTrackCardsProps {
  band: SongBand | undefined
  /** The whole band after a change; `undefined` when nothing of the song's own is left. */
  onChange: (band: SongBand | undefined) => void
  /** Open the editor of a track. */
  onEdit: (role: TrackRole) => void
}

const HINTS: Record<TrackRole, string> = {
  lead: 'Teclado solista, guitarra eléctrica o saxo.',
  arrangement: 'Cuerdas, metales o coro.',
}

export function BandTrackCards({ band, onChange, onEdit }: BandTrackCardsProps) {
  const update = (role: TrackRole, changes: Partial<BandTrack>) => {
    const current = band?.[role]
    const next: BandTrack = { voice: trackVoice(role, current?.voice), notes: current?.notes ?? [], ...current, ...changes }
    onChange(cleanSongBand({ ...band, [role]: next }))
  }

  return (
    <div>
      {TRACK_ROLES.map((role) => {
        const track = band?.[role]
        const title = TRACK_ROLE_LABELS[role]
        const count = track?.notes.length ?? 0
        const volume = trackVolume(track)
        const muted = track?.muted === true
        return (
          <div
            key={role}
            role="region"
            aria-label={title}
            className="mx-4 mt-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1a1f36] p-3 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {count > 0
                    ? `${TRACK_VOICE_LABELS[trackVoice(role, track?.voice)]} · ${count} ${count === 1 ? 'nota' : 'notas'}`
                    : `Sin escribir. ${HINTS[role]}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(role)}
                className="h-9 shrink-0 rounded-xl bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 flex items-center gap-1.5"
              >
                <FilePenLine className="h-4 w-4" aria-hidden />
                {count > 0 ? 'Editar' : 'Escribir o grabar'}
              </button>
            </div>

            {count > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!muted}
                  aria-label={`Suena: ${title.toLowerCase()}`}
                  onClick={() => update(role, { muted: !muted })}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    muted ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300'
                  )}
                >
                  {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={volume}
                  aria-label={`Volumen: ${title.toLowerCase()}`}
                  onChange={(event) => update(role, { volume: Number(event.target.value) })}
                  className="h-1.5 w-full cursor-pointer accent-indigo-500"
                />
                <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-300">{volume}%</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
