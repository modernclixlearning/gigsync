import type { SongTextAlign } from '~/types'

/**
 * Default look of a chord label in read mode, shared by lyric lines,
 * instrumental sections and chords-only lines so every chord in the song
 * looks the same. "Colores de acordes" overrides it for all of them.
 */
export const CHORD_LABEL_COLOR = 'text-sky-400/70'

/** Song alignment for flex rows (chords-only lines). */
export const ALIGN_JUSTIFY: Record<SongTextAlign, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

/** Song alignment for flex columns (a chord inside its instrumental bar). */
export const ALIGN_ITEMS: Record<SongTextAlign, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
}
