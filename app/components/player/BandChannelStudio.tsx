/**
 * The band's channels as big cards, one per channel: the click, the drums, the
 * bass, the chords, the lead melody and the arrangement. Everything about a
 * channel is in its card — switch, volume, its sound or pattern, what it plays
 * in this song — and so are the tools: its pattern, recording or writing it,
 * and playing it live from a controller. A tool opens in a modal for that
 * channel alone; recording and writing open the full-screen editor.
 *
 * The cards grow with the room there is: one column in a narrow panel, two
 * when it is wide, with bigger type and buttons.
 */

import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Mic, Piano, Volume2, VolumeX, Wand2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Dialog } from '~/components/layout'
import { BandPatternEditor, type BandPatternEditorProps } from './BandPatternEditor'
import { LiveMonitorCard, type LiveMonitorCardProps } from './LiveMonitorCard'
import {
  BASS_ICONS,
  IconChoices,
  LOOKS,
  PatternChoices,
  SourceBadge,
  type ChannelSource,
} from './ChannelControls'
import { cleanSongBand, patternHasHits, type SongBand } from '~/lib/audio/bandPatterns'
import {
  BAND_ROLE_LABELS,
  TRACK_VOICES,
  TRACK_VOICE_LABELS,
  isTrackRole,
  trackVoice,
  trackVolume,
  type BandRole,
  type BandTrack,
  type TakeRole,
  type TrackRole,
  type TrackVoice,
} from '~/lib/audio/bandTracks'
import { BASS_VOICES, BASS_VOICE_LABELS, type BassVoice, type DrumPattern } from '~/lib/audio/bandSound'
import type { MonitorRole } from '~/lib/midi/liveMonitor'

/** The lead melody and the arrangement: what the song has, and the way into their editor. */
export interface TrackChannelProps {
  band: SongBand | undefined
  /** The whole band after a change; `undefined` when nothing of the song's own is left. */
  onChange: (band: SongBand | undefined) => void
  /** Open the editor of a track. */
  onEdit: (role: TrackRole) => void
}

export interface BandChannelStudioProps {
  metronome: ChannelSource
  /** Chords (a piano). */
  chords: ChannelSource
  bass?: ChannelSource & { voice: BassVoice; onVoiceChange: (voice: BassVoice) => void }
  drums?: ChannelSource & { pattern: DrumPattern; onPatternChange: (pattern: DrumPattern) => void }
  /** The patterns and live takes of this song. Without it the cards have no pattern or record tools. */
  patterns?: BandPatternEditorProps
  /** The tracks written for this song. Without it there are no lead and arrangement cards. */
  tracks?: TrackChannelProps
  /** Playing the channels live from a controller. Without it there are no Tocar buttons. */
  liveMonitor?: LiveMonitorCardProps
}

/** What a channel plays in this song, in a few words. */
function summary(role: BandRole, band: SongBand | undefined): string {
  if (isTrackRole(role)) {
    const track = band?.[role]
    const count = track?.notes.length ?? 0
    if (count === 0) return 'Sin escribir'
    return `${count} ${count === 1 ? 'nota' : 'notas'}${track?.muted ? ' · silenciada' : ''}`
  }
  const take = band?.takes?.[role]
  if (take && take.notes.length > 0) return take.off ? 'Toma en vivo apagada' : `Toma en vivo · ${take.notes.length} notas`
  if (role === 'drums') return band?.drums && Object.values(band.drums).some(patternHasHits) ? 'Patrón propio' : 'Patrón general'
  const rhythm = role === 'bass' ? band?.bassRhythm : band?.chordRhythm
  return patternHasHits(rhythm) ? 'Ritmo propio' : role === 'bass' ? 'Nota larga por acorde' : 'Acorde largo'
}

const toolClass = cn(
  'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors @sm:h-12 @sm:text-base',
  // Two cards to a row: the icon goes above the word, so the word is never cut.
  '@xl:h-16 @xl:flex-col @xl:gap-1 @xl:text-sm',
  'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
)

const chipClass = (selected: boolean) =>
  cn(
    'h-9 shrink-0 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-60',
    selected
      ? 'bg-indigo-600 text-white'
      : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
  )

/** A channel's card: switch, name, volume, its own choices (children) and its tools. */
function ChannelCard({
  look,
  name,
  detail,
  source,
  badge,
  tools,
  children,
}: {
  look: keyof typeof LOOKS
  name: string
  /** What it plays in this song. */
  detail?: string
  source: ChannelSource
  /** Where the sound comes from (samples or synth). */
  badge?: ReactNode
  tools?: ReactNode
  children?: ReactNode
}) {
  const { icon: LookIcon, bubble, accent } = LOOKS[look]
  return (
    <div
      role="region"
      aria-label={`Canal: ${name}`}
      className="flex h-full flex-col gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 shadow-sm dark:border-slate-600 dark:bg-[#1a1f36] @sm:gap-4 @sm:p-5"
    >
      <div className="flex items-center gap-3 @sm:gap-4">
        <button
          type="button"
          role="switch"
          aria-checked={source.enabled}
          aria-label={name}
          onClick={source.onToggle}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all @sm:h-14 @sm:w-14',
            source.enabled ? bubble : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
            source.enabled && 'ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#1a1f36] ring-current'
          )}
        >
          <LookIcon className="h-6 w-6 @sm:h-7 @sm:w-7" aria-hidden />
        </button>
        <div className="min-w-0 space-y-0.5">
          <p className="text-base font-semibold text-slate-900 dark:text-white @sm:text-lg">{name}</p>
          {detail && <p className="truncate text-xs text-slate-600 dark:text-slate-300 @sm:text-sm">{detail}</p>}
          {badge}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {source.volume === 0 ? (
          <VolumeX className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
        )}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={source.volume}
          aria-label={`Volumen: ${name.toLowerCase()}`}
          onChange={(event) => source.onVolumeChange(Number(event.target.value))}
          className={cn('h-1.5 w-full cursor-pointer', accent)}
        />
        <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-600 dark:text-slate-300 @sm:text-xs">
          {source.volume}%
        </span>
      </div>

      {children}
      {tools && <div className="mt-auto grid auto-cols-fr grid-flow-col gap-2 pt-1">{tools}</div>}
    </div>
  )
}

export function BandChannelStudio({ metronome, chords, bass, drums, patterns, tracks, liveMonitor }: BandChannelStudioProps) {
  const [open, setOpen] = useState<{ role: BandRole; tool: 'pattern' | 'play' } | null>(null)
  const band = patterns?.band ?? tracks?.band

  const record = (role: BandRole) => {
    setOpen(null)
    if (isTrackRole(role)) tracks?.onEdit(role)
    else patterns?.onEditTake?.(role as TakeRole)
  }
  const play = (role: BandRole) => {
    if (!liveMonitor) return
    // Playing it live: the keys take this channel's sound, and the monitor is on.
    liveMonitor.onRoleChange(role as MonitorRole)
    if (!liveMonitor.enabled) liveMonitor.onToggle()
    setOpen({ role, tool: 'play' })
  }

  /** The tools of a channel: its pattern (when it follows one), recording or writing it, playing it. */
  const tools = (role: BandRole) => {
    const name = BAND_ROLE_LABELS[role]
    const isTrack = isTrackRole(role)
    const canRecord = isTrack ? !!tracks : !!patterns?.onEditTake
    return (
      <>
        {!isTrack && patterns && (
          <button type="button" onClick={() => setOpen({ role, tool: 'pattern' })} aria-label={`Patrón: ${name}`} className={toolClass}>
            <Wand2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Patrón</span>
          </button>
        )}
        {canRecord && (
          <button type="button" onClick={() => record(role)} aria-label={`${isTrack ? 'Escribir' : 'Grabar'}: ${name}`} className={toolClass}>
            <Mic className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{isTrack ? 'Escribir' : 'Grabar'}</span>
          </button>
        )}
        {liveMonitor && (
          <button type="button" onClick={() => play(role)} aria-label={`Tocar: ${name}`} className={toolClass}>
            <Piano className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Tocar</span>
          </button>
        )}
      </>
    )
  }

  /** A written track as a channel: its switch is «plays», its voices are chips, its level is the track's. */
  const trackCard = (role: TrackRole) => {
    if (!tracks) return null
    const track: BandTrack | undefined = tracks.band?.[role]
    const count = track?.notes.length ?? 0
    const voice = trackVoice(role, track?.voice)
    const change = (changes: Partial<BandTrack>) =>
      tracks.onChange(cleanSongBand({ ...tracks.band, [role]: { voice, notes: track?.notes ?? [], ...track, ...changes } }))
    const source: ChannelSource = {
      enabled: count > 0 && track?.muted !== true,
      onToggle: () => count > 0 && change({ muted: track?.muted !== true }),
      volume: trackVolume(track),
      onVolumeChange: (volume) => change({ volume }),
    }
    return (
      <ChannelCard key={role} look={role} name={BAND_ROLE_LABELS[role]} detail={summary(role, tracks.band)} source={source} tools={tools(role)}>
        <div role="radiogroup" aria-label={`Sonido: ${BAND_ROLE_LABELS[role].toLowerCase()}`} className="flex flex-wrap gap-1.5">
          {TRACK_VOICES[role].map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={voice === option}
              onClick={() => change({ voice: option as TrackVoice })}
              className={chipClass(voice === option)}
            >
              {TRACK_VOICE_LABELS[option]}
            </button>
          ))}
        </div>
      </ChannelCard>
    )
  }

  const modal = open && (
    <Dialog
      size="xl"
      title={open.tool === 'play' ? `Tocar: ${BAND_ROLE_LABELS[open.role]}` : BAND_ROLE_LABELS[open.role]}
      onClose={() => setOpen(null)}
    >
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {open.tool === 'play' && liveMonitor ? (
          <LiveMonitorCard {...liveMonitor} className="" />
        ) : patterns ? (
          <BandPatternEditor {...patterns} only={open.role as TakeRole} onEditTake={record} className="" />
        ) : null}
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
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        <ChannelCard look="metronome" name="Metrónomo" detail="Click" source={metronome} />
        {drums && (
          <ChannelCard
            look="drums"
            name="Batería"
            detail={summary('drums', band)}
            source={drums}
            badge={<SourceBadge channel="drums" />}
            tools={tools('drums')}
          >
            <PatternChoices value={drums.pattern} onChange={drums.onPatternChange} disabled={!drums.enabled} />
          </ChannelCard>
        )}
        {bass && (
          <ChannelCard
            look="bass"
            name="Bajo"
            detail={summary('bass', band)}
            source={bass}
            badge={<SourceBadge channel="bass" />}
            tools={tools('bass')}
          >
            <IconChoices
              label="Sonido del bajo"
              options={BASS_VOICES}
              labels={BASS_VOICE_LABELS}
              icons={BASS_ICONS}
              value={bass.voice}
              onChange={bass.onVoiceChange}
              disabled={!bass.enabled}
            />
          </ChannelCard>
        )}
        <ChannelCard
          look="keys"
          name="Acordes"
          detail={summary('keys', band)}
          source={chords}
          badge={<SourceBadge channel="keys" />}
          tools={tools('keys')}
        />
        {trackCard('lead')}
        {trackCard('arrangement')}
      </div>
      {modal && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </div>
  )
}
