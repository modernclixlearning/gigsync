import type { BeatHighlightMode } from '~/types/song'

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/**
 * Glow behind the highlighted word. Intensity scales the glow color's
 * opacity: 100 is the original full-strength glow, 0 turns it off.
 */
export function glowTextShadow(color: string, intensity: number): string {
  const pct = clamp(Math.round(intensity), 0, 100)
  if (pct === 0) return 'none'
  const glow = pct === 100 ? color : `color-mix(in srgb, ${color} ${pct}%, transparent)`
  return `0 0 0.4em ${glow}`
}

export interface BeatHighlightStyle {
  /** How the lyric of the beat stands out. */
  lyricMode: BeatHighlightMode
  /** How the chord of the beat stands out. */
  chordMode: BeatHighlightMode
  textColor: string
  bgColor: string
  glowColor: string
  glowIntensity: number
}

/**
 * CSS for the cell playing right now in the active line. The lyric (the
 * cell) and its chord label (the cell's first child) are styled separately,
 * so e.g. the lyric can light up in color while the chord gets a box.
 */
export function beatHighlightCss(elementId: string, chordIndex: number, style: BeatHighlightStyle): string {
  const cell = `[data-element-id="${elementId}"] [data-chord-index="${chordIndex}"]`
  const glow = glowTextShadow(style.glowColor, style.glowIntensity)

  const lyric =
    style.lyricMode === 'background'
      ? `
              /* Lyric of the beat: background box */
              ${cell} {
                background-color: ${style.bgColor};
                color: #fff;
                border-radius: 0.25em;
                padding: 0 0.15em;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
                transition: background-color 0.15s ease;
              }`
      : `
              /* Lyric of the beat: lit in color, not a box */
              ${cell} {
                color: ${style.textColor};
                text-shadow: ${glow};
                transition: text-shadow 0.15s ease;
              }`

  const chord =
    style.chordMode === 'background'
      ? `
              /* Chord of the beat: background box */
              ${cell} > span:first-child {
                background-color: ${style.bgColor};
                color: #fff;
                text-shadow: none;
                border-radius: 0.25em;
                padding: 0 0.15em;
              }`
      : `
              /* Chord of the beat: lit in color */
              ${cell} > span:first-child {
                color: ${style.textColor};
                text-shadow: ${glow};
              }`

  return lyric + chord
}

/** Marker class on every chord label in read mode (lyric lines, instrumentals, chords-only lines). */
export const CHORD_LABEL_CLASS = 'gs-chord'

/**
 * The player's chord color / background settings. Unset values keep each
 * place's default (sky on lyric lines, the section color on instrumentals).
 * The beat highlight rules are more specific, so the chord that's playing
 * still stands out.
 */
export function chordColorsCss(scope: string, textColor: string | null, bgColor: string | null): string {
  if (!textColor && !bgColor) return ''
  return `
              ${scope} .${CHORD_LABEL_CLASS} {
                ${textColor ? `color: ${textColor};` : ''}
                ${bgColor ? `background-color: ${bgColor}; border-radius: 0.25em; padding: 0 0.15em;` : ''}
              }`
}
