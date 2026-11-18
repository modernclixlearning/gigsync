/**
 * The band's channels as big cards, one per role — drums, bass, chords, lead
 * melody and arrangement. Each card says what the channel plays in this song
 * and has the same three tools: its pattern (or sound), recording / writing it,
 * and playing it live from a controller. A tool opens in a modal for that
 * channel alone; recording and writing open the full-screen editor.
 *
 * The cards grow with the room there is: one column in a narrow panel, two or
 * three when it is wide, with bigger type and buttons.
 */

import { useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { Drum, Guitar, Mic, Music2, Piano, Sliders, Sparkles, Wand2, type LucideProps } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Dialog } from '~/components/layout'
import { BandPatternEditor, type BandPatternEditorProps } from './BandPatternEditor'
import { BandTrackCards, type BandTrackCardsProps } from './BandTrackCards'
import { LiveMonitorCard, type LiveMonitorCardProps } from './LiveMonitorCard'
import { patternHasHits } from '~/lib/audio/bandPatterns'
import { BAND_ROLE_LABELS, TRACK_VOICE_LABELS, isTrackRole, trackVoice, type BandRole, type TakeRole } from '~/lib/audio/bandTracks'
import type { MonitorRole } from '~/lib/midi/liveMonitor'

type Icon = ComponentType<LucideProps>
type Tool = 'pattern' | 'record' | 'play'

export const STUDIO_ROLES: readonly BandRole[] = ['drums', 'bass', 'keys', 'lead', 'arrangement']

const LOOKS: Record<BandRole, { icon: Icon; bubble: string }> = {
  drums: { icon: Drum, bubble: 'bg-rose-100 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300' },
  bass: { icon: Guitar, bubble: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300' },
  keys: { icon: Piano, bubble: 'bg-sky-100 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300' },
  lead: { icon: Music2, bubble: 'bg-violet-100 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300' },
  arrangement: { icon: Sparkles, bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300' },
}

export interface BandChannelStudioProps {
  patterns: BandPatternEditorProps
  tracks: BandTrackCardsProps
  liveMonitor: LiveMonitorCardProps
}

/** What a channel plays in this song, in a few words. */
function summary(role: BandRole, { patterns, tracks }: BandChannelStudioProps): string {
  const band = patterns.band
  if (isTrackRole(role)) {
    const track = band?.[role]
    const count = track?.notes.length ?? 0
    if (count === 0) return 'Sin escribir'
    return `${TRACK_VOICE_LABELS[trackVoice(role, track?.voice)]} · ${count} ${count === 1 ? 'nota' : 'notas'}${track?.muted ? ' · silenciada' : ''}`
  }
  const take = band?.takes?.[role]
  if (take && take.notes.length > 0) return take.off ? 'Toma en vivo apagada' : `Toma en vivo · ${take.notes.length} notas`
  if (role === 'drums') return band?.drums && Object.values(band.drums).some(patternHasHits) ? 'Patrón propio' : 'Patrón general'
  const rhythm = role === 'bass' ? band?.bassRhythm : band?.chordRhythm
  return patternHasHits(rhythm) ? 'Ritmo propio' : role === 'bass' ? 'Nota larga por acorde' : 'Acorde largo'
}

const buttonClass = cn(
  'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors @sm:h-12 @sm:text-base',
  // Two cards to a row: the icon goes above the word, so the word is never cut.
  '@xl:h-16 @xl:flex-col @xl:gap-1 @xl:text-sm',
  'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
)

export function BandChannelStudio(props: BandChannelStudioProps) {
  const { patterns, tracks, liveMonitor } = props
  const [open, setOpen] = useState<{ role: BandRole; tool: 'pattern' | 'play' } | null>(null)

  const record = (role: BandRole) => {
    setOpen(null)
    if (isTrackRole(role)) tracks.onEdit(role)
    else patterns.onEditTake?.(role as TakeRole)
  }

  const use = (role: BandRole, tool: Tool) => {
    if (tool === 'record') return record(role)
    if (tool === 'play') {
      // Playing it live: the keys take this channel's sound, and the monitor is on.
      liveMonitor.onRoleChange(role as MonitorRole)
      if (!liveMonitor.enabled) liveMonitor.onToggle()
    }
    setOpen({ role, tool })
  }

  const modal = open && (
    <Dialog
      size="xl"
      title={open.tool === 'play' ? `Tocar: ${BAND_ROLE_LABELS[open.role]}` : BAND_ROLE_LABELS[open.role]}
      onClose={() => setOpen(null)}
    >
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {open.tool === 'play' ? (
          <LiveMonitorCard {...liveMonitor} className="" />
        ) : isTrackRole(open.role) ? (
          <BandTrackCards {...tracks} only={open.role} onEdit={record} className="" />
        ) : (
          <BandPatternEditor {...patterns} only={open.role as TakeRole} onEditTake={record} className="" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(null)}
        className="mt-4 h-11 w-full shrink-0 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
      >
        Listo
      </button>
    </Dialog>
  )

  return (
    <div className="@container px-4 pt-3">
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
        {STUDIO_ROLES.map((role) => {
          const { icon: RoleIcon, bubble } = LOOKS[role]
          const name = BAND_ROLE_LABELS[role]
          const isTrack = isTrackRole(role)
          return (
            <div
              key={role}
              role="region"
              aria-label={`Canal: ${name}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm dark:border-slate-600 dark:bg-[#1a1f36] @sm:gap-4 @sm:p-5"
            >
              <div className="flex items-center gap-3 @sm:gap-4">
                <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full @sm:h-14 @sm:w-14', bubble)}>
                  <RoleIcon className="h-6 w-6 @sm:h-7 @sm:w-7" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900 dark:text-white @sm:text-lg">{name}</p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300 @sm:text-sm">{summary(role, props)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => use(role, 'pattern')} aria-label={`${isTrack ? 'Sonido' : 'Patrón'}: ${name}`} className={buttonClass}>
                  {isTrack ? <Sliders className="h-4 w-4 shrink-0" aria-hidden /> : <Wand2 className="h-4 w-4 shrink-0" aria-hidden />}
                  <span className="truncate">{isTrack ? 'Sonido' : 'Patrón'}</span>
                </button>
                <button type="button" onClick={() => use(role, 'record')} aria-label={`${isTrack ? 'Escribir' : 'Grabar'}: ${name}`} className={buttonClass}>
                  <Mic className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{isTrack ? 'Escribir' : 'Grabar'}</span>
                </button>
                <button type="button" onClick={() => use(role, 'play')} aria-label={`Tocar: ${name}`} className={buttonClass}>
                  <Piano className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">Tocar</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {modal && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </div>
  )
}
