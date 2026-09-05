import { describe, it, expect } from 'vitest'
import {
  planSongImport,
  planSetlistImport,
  resolveSongsToWrite,
} from '../importMerge'
import type { Song, Setlist } from '~/types/setlist'

const song = (overrides: Partial<Song> = {}): Song => ({
  id: 's1',
  title: 'Song 1',
  artist: 'Artist 1',
  bpm: 120,
  key: 'C',
  timeSignature: '4/4',
  duration: 180,
  lyrics: '[C]Hello',
  tags: ['favorite'],
  timesPlayed: 3,
  lastPlayed: new Date('2026-01-01'),
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
  ...overrides,
})

const setlist = (overrides: Partial<Setlist> = {}): Setlist => ({
  id: 'sl1',
  name: 'Set A',
  songIds: [],
  totalDuration: 0,
  createdAt: new Date('2025-01-01'),
  ...overrides,
})

describe('planSongImport', () => {
  it('treats a song with an unseen id as new', () => {
    const { newSongs, conflicts } = planSongImport([], [song({ id: 's1' })])
    expect(newSongs).toHaveLength(1)
    expect(conflicts).toHaveLength(0)
  })

  it('does not flag a conflict when content is identical, even if usage stats differ', () => {
    const existing = song({ timesPlayed: 10, lastPlayed: new Date('2026-05-01') })
    const imported = song({ timesPlayed: 0, lastPlayed: undefined, updatedAt: new Date('2020-01-01') })

    const { newSongs, conflicts } = planSongImport([existing], [imported])
    expect(newSongs).toHaveLength(0)
    expect(conflicts).toHaveLength(0)
  })

  it('flags a conflict when content differs and reports which fields', () => {
    const existing = song({ lyrics: '[C]Hello', bpm: 120 })
    const imported = song({ lyrics: '[C]Hello there', bpm: 100 })

    const { conflicts } = planSongImport([existing], [imported])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].differingFields).toEqual(expect.arrayContaining(['lyrics', 'bpm']))
  })

  it('treats reordered tags as equal, not a conflict', () => {
    const existing = song({ tags: ['favorite', 'live'] })
    const imported = song({ tags: ['live', 'favorite'] })

    const { conflicts } = planSongImport([existing], [imported])
    expect(conflicts).toHaveLength(0)
  })

  it('never touches existing songs directly — only reports conflicts for the caller to resolve', () => {
    const existing = song({ title: 'Existing title' })
    const imported = song({ title: 'Imported title' })

    planSongImport([existing], [imported])
    expect(existing.title).toBe('Existing title')
  })
})

describe('planSetlistImport', () => {
  it('adds setlists that do not exist locally', () => {
    const { newSetlists } = planSetlistImport([], [setlist({ id: 'sl1' })])
    expect(newSetlists).toHaveLength(1)
  })

  it('does not surface or overwrite a setlist that already exists locally', () => {
    const existing = setlist({ id: 'sl1', name: 'Local name' })
    const imported = setlist({ id: 'sl1', name: 'Imported name' })

    const { newSetlists } = planSetlistImport([existing], [imported])
    expect(newSetlists).toHaveLength(0)
    expect(existing.name).toBe('Local name')
  })
})

describe('resolveSongsToWrite', () => {
  it('only returns imported versions for conflicts explicitly resolved as use-imported', () => {
    const conflictA = {
      id: 'a',
      existing: song({ id: 'a' }),
      imported: song({ id: 'a', title: 'Imported A' }),
      differingFields: ['title' as const],
    }
    const conflictB = {
      id: 'b',
      existing: song({ id: 'b' }),
      imported: song({ id: 'b', title: 'Imported B' }),
      differingFields: ['title' as const],
    }

    const result = resolveSongsToWrite([conflictA, conflictB], {
      a: 'use-imported',
      b: 'keep-existing',
    })

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Imported A')
  })
})
