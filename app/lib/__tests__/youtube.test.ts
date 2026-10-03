import { describe, it, expect } from 'vitest'
import {
  parseYouTubeUrl,
  parseYouTubeTime,
  buildYouTubeSearchUrl,
  canonicalYouTubeUrl,
  normalizeStartSeconds,
  formatSeconds,
} from '../youtube'

const ID = 'dQw4w9WgXcQ'

describe('parseYouTubeUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}&feature=share`,
    `https://music.youtube.com/watch?v=${ID}&list=RD123`,
    `http://www.youtube.com/watch?feature=youtu.be&v=${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])('extracts the id from %s', (link) => {
    expect(parseYouTubeUrl(link)).toEqual({ videoId: ID })
  })

  it.each([
    [`https://youtu.be/${ID}?t=42`, 42],
    [`https://www.youtube.com/watch?v=${ID}&t=90s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1m30s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1h0m5s`, 3605],
    [`https://www.youtube.com/embed/${ID}?start=12`, 12],
    [`https://www.youtube.com/watch?v=${ID}#t=75`, 75],
    [`https://youtu.be/${ID}?si=x&t=7`, 7],
  ])('reads the start time from %s', (link, seconds) => {
    expect(parseYouTubeUrl(link)).toEqual({ videoId: ID, startSeconds: seconds })
  })

  it('ignores t=0 and malformed times', () => {
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?t=0`)).toEqual({ videoId: ID })
    expect(parseYouTubeUrl(`https://youtu.be/${ID}?t=abc`)).toEqual({ videoId: ID })
  })

  it.each([
    '',
    '   ',
    'not a link',
    'https://www.youtube.com/',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${ID}extra`,
    'https://www.youtube.com/results?search_query=foo',
    'https://www.youtube.com/@channel',
    `https://www.youtube.com/playlist?list=PL${ID}`,
    `https://vimeo.com/${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `ftp://youtu.be/${ID}`,
    `javascript:alert(1)//youtu.be/${ID}`,
    `https://youtu.be/${ID} other`,
  ])('rejects %s', (link) => {
    expect(parseYouTubeUrl(link)).toBeNull()
  })

  it('rejects null/undefined', () => {
    expect(parseYouTubeUrl(null)).toBeNull()
    expect(parseYouTubeUrl(undefined)).toBeNull()
  })
})

describe('parseYouTubeTime', () => {
  it.each([
    ['90', 90],
    ['90.7', 90],
    ['90s', 90],
    ['2m', 120],
    ['1h', 3600],
    ['1:30', 90],
    ['1:02:03', 3723],
  ])('%s → %d', (value, seconds) => {
    expect(parseYouTubeTime(value)).toBe(seconds)
  })

  it.each([null, undefined, '', 'abc', 'm', '1x', '-5'])('%s → undefined', (value) => {
    expect(parseYouTubeTime(value)).toBeUndefined()
  })
})

describe('helpers', () => {
  it('builds the search url with artist + title encoded', () => {
    expect(buildYouTubeSearchUrl('Soda Stereo', 'De Música Ligera')).toBe(
      'https://www.youtube.com/results?search_query=Soda%20Stereo%20De%20M%C3%BAsica%20Ligera'
    )
    expect(buildYouTubeSearchUrl('', ' Solo título ')).toBe(
      'https://www.youtube.com/results?search_query=Solo%20t%C3%ADtulo'
    )
  })

  it('canonicalizes the stored link', () => {
    expect(canonicalYouTubeUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`)
    expect(parseYouTubeUrl(canonicalYouTubeUrl(ID))).toEqual({ videoId: ID })
  })

  it('normalizes start seconds', () => {
    expect(normalizeStartSeconds(12.9)).toBe(12)
    expect(normalizeStartSeconds(-3)).toBe(0)
    expect(normalizeStartSeconds('7')).toBe(7)
    expect(normalizeStartSeconds(undefined)).toBe(0)
    expect(normalizeStartSeconds(Number.NaN)).toBe(0)
  })

  it('formats seconds', () => {
    expect(formatSeconds(0)).toBe('0:00')
    expect(formatSeconds(75)).toBe('1:15')
    expect(formatSeconds(3723)).toBe('1:02:03')
  })
})
