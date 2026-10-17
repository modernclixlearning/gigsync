import { useState, useEffect } from 'react'
import { cn } from '~/lib/utils'
import { SongYouTubeField } from '~/components/songs/SongYouTubeField'
import type { CreateSongInput } from '~/types'

interface SongFormProps {
  data: CreateSongInput
  onChange: (data: CreateSongInput) => void
  /** Omit for live editing (changes are saved as they happen) — hides the submit button. */
  onSubmit?: () => void
  submitLabel?: string
  /**
   * Pass to make the ChordPro text read-only until "Editar" is pressed
   * (the player's side panel). Omit for an always-editable field.
   */
  lyricsLock?: { locked: boolean; onToggle: () => void }
}

const KEYS = [
  'C', 'Cm', 'C#', 'C#m', 
  'D', 'Dm', 'D#', 'D#m', 
  'E', 'Em', 
  'F', 'Fm', 'F#', 'F#m', 
  'G', 'Gm', 'G#', 'G#m', 
  'A', 'Am', 'A#', 'A#m', 
  'B', 'Bm'
]
const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8']

export function SongForm({
  data,
  onChange,
  onSubmit,
  submitLabel = 'Save',
  lyricsLock
}: SongFormProps) {
  // Local state for tags input to allow typing commas
  const [tagsInput, setTagsInput] = useState(data.tags?.join(', ') ?? '')
  // An invalid YouTube link blocks saving (it would otherwise be dropped silently).
  const [isYouTubeValid, setIsYouTubeValid] = useState(true)
  
  // Sync local state when external data changes (e.g., from ChordPro import)
  useEffect(() => {
    setTagsInput(data.tags?.join(', ') ?? '')
  }, [data.tags?.join(',')])

  const handleChange = (field: keyof CreateSongInput, value: string | number | string[]) => {
    onChange({ ...data, [field]: value })
  }

  const handleTagsBlur = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    handleChange('tags', tags)
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Song title"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
          required
        />
      </div>

      {/* Artist */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Artist *
        </label>
        <input
          type="text"
          value={data.artist}
          onChange={(e) => handleChange('artist', e.target.value)}
          placeholder="Artist name"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
          required
        />
      </div>

      {/* Key & BPM Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Key
          </label>
          <select
            value={data.key}
            onChange={(e) => handleChange('key', e.target.value)}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          >
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            BPM
          </label>
          <input
            type="number"
            value={data.bpm}
            onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 120)}
            min={20}
            max={300}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          />
        </div>
      </div>

      {/* Time Signature & Duration Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Time Signature
          </label>
          <select
            value={data.timeSignature}
            onChange={(e) => handleChange('timeSignature', e.target.value)}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500'
            )}
          >
            {TIME_SIGNATURES.map((sig) => (
              <option key={sig} value={sig}>
                {sig}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.floor((data.duration ?? 0) / 60)}
              onChange={(e) => {
                const minutes = parseInt(e.target.value) || 0
                const seconds = (data.duration ?? 0) % 60
                handleChange('duration', minutes * 60 + seconds)
              }}
              min={0}
              max={99}
              placeholder="0"
              className={cn(
                'w-20 px-3 py-3 rounded-xl text-center',
                'bg-white dark:bg-[#1a1f36]',
                'border border-slate-200 dark:border-slate-700',
                'text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500'
              )}
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium">:</span>
            <input
              type="number"
              value={(data.duration ?? 0) % 60}
              onChange={(e) => {
                const minutes = Math.floor((data.duration ?? 0) / 60)
                const seconds = Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                handleChange('duration', minutes * 60 + seconds)
              }}
              min={0}
              max={59}
              placeholder="00"
              className={cn(
                'w-20 px-3 py-3 rounded-xl text-center',
                'bg-white dark:bg-[#1a1f36]',
                'border border-slate-200 dark:border-slate-700',
                'text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500'
              )}
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">min : sec</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={handleTagsBlur}
          placeholder="rock, classic, favorite"
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500'
          )}
        />
      </div>

      {/* Lyrics */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="song-lyrics" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Lyrics & Chords
          </label>
          {lyricsLock && (
            <button
              type="button"
              onClick={lyricsLock.onToggle}
              aria-pressed={!lyricsLock.locked}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                lyricsLock.locked
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              )}
            >
              {lyricsLock.locked ? 'Editar texto' : 'Listo'}
            </button>
          )}
        </div>
        <textarea
          id="song-lyrics"
          value={data.lyrics}
          onChange={(e) => handleChange('lyrics', e.target.value)}
          readOnly={lyricsLock?.locked}
          placeholder="Enter lyrics with chords in brackets, e.g., [Am]Hello [G]World"
          rows={12}
          className={cn(
            'w-full px-4 py-3 rounded-xl font-mono text-sm',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'resize-y',
            lyricsLock?.locked
              ? 'bg-slate-50 dark:bg-[#151a2e] text-slate-600 dark:text-slate-300 cursor-default focus:ring-0'
              : 'bg-white dark:bg-[#1a1f36]'
          )}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Use [Chord] notation for chords, e.g., [Am]Lyrics here[G]more lyrics
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Performance notes, capo position, etc."
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'resize-y'
          )}
        />
      </div>

      {/* YouTube play-along (#38) */}
      <SongYouTubeField
        artist={data.artist}
        title={data.title}
        youtubeUrl={data.youtubeUrl}
        youtubeStartSeconds={data.youtubeStartSeconds}
        onChange={(value) => onChange({ ...data, ...value })}
        onValidityChange={setIsYouTubeValid}
      />

      {/* Submit Button */}
      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={!data.title || !data.artist || !isYouTubeValid}
          className={cn(
            'w-full py-4 rounded-xl font-semibold',
            'bg-indigo-500 text-white',
            'hover:bg-indigo-600 active:bg-indigo-700',
            'disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {submitLabel}
        </button>
      )}
    </div>
  )
}
