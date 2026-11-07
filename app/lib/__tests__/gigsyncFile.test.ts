import { describe, it, expect } from 'vitest'
import { parseGigsync, setlistFile, selectionFile, songFile, fileSlug } from '../gigsyncFile'
import type { Song, Setlist } from '~/types/setlist'

const song = (id: string, extra: Partial<Song> = {}): Song => ({
  id,
  title: `Tema ${id}`,
  artist: 'A',
  bpm: 100,
  key: 'C',
  timeSignature: '4/4',
  duration: 200,
  lyrics: '[C]hola',
  tags: [],
  timesPlayed: 2,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
  ...extra,
})

const songs = ['x', 'y', 'z', 'w'].map((id) => song(id))
const setlist: Setlist = { id: 's1', name: 'Boda', songIds: ['z', 'x', 'gone'], totalDuration: 0, createdAt: new Date('2026-02-01T00:00:00Z') }

describe('gigsyncFile', () => {
  it('one song', () => {
    const file = songFile(songs[0])
    expect(file).toMatchObject({ format: 'gigsync', kind: 'song', setlists: [] })
    expect(file.songs.map((s) => s.id)).toEqual(['x'])
  })

  it('a setlist carries its songs in order, skipping the ones that no longer exist', () => {
    const file = setlistFile(setlist, songs)
    expect(file.kind).toBe('setlist')
    expect(file.songs.map((s) => s.id)).toEqual(['z', 'x'])
    expect(file.setlists.map((s) => s.id)).toEqual(['s1'])
  })

  it('a hand-picked list keeps only the chosen songs', () => {
    const file = selectionFile(new Set(['y', 'w']), songs)
    expect(file.kind).toBe('selection')
    expect(file.songs.map((s) => s.id)).toEqual(['y', 'w'])
    expect(file.setlists).toEqual([])
  })

  it('round trip: dates come back as dates and the keyboard take survives', () => {
    const take = { bpm: 90, beatsPerBar: 4, durationSeconds: 4, notes: [{ startTimeSeconds: 0, durationSeconds: 1, pitchMidi: 60, amplitude: 0.5 }] }
    const text = JSON.stringify(setlistFile(setlist, [song('x', { midiTake: take, lastPlayed: new Date('2026-03-01T00:00:00Z') }), songs[2]]))
    const parsed = parseGigsync(text)
    expect(parsed.songs[0].createdAt).toBeInstanceOf(Date)
    expect(parsed.songs.find((s) => s.id === 'x')?.lastPlayed).toBeInstanceOf(Date)
    expect(parsed.songs.find((s) => s.id === 'x')?.midiTake).toEqual(take)
    expect(parsed.setlists[0].createdAt).toBeInstanceOf(Date)
  })

  it('reads an old full backup (version 1) too', () => {
    const backup = JSON.stringify({ version: 1, songs: [song('a')], setlists: [], profile: '{"p":1}', settings: null, exportedAt: 'x' })
    const parsed = parseGigsync(backup)
    expect(parsed.songs).toHaveLength(1)
    expect(parsed.profile).toBe('{"p":1}')
  })

  it('rejects things that are not GigSync files', () => {
    expect(() => parseGigsync('{"hello":1}')).toThrow()
    expect(() => parseGigsync('not json')).toThrow()
  })

  it('file names are safe', () => {
    expect(fileSlug('Canción de Mañana (en vivo)')).toBe('cancion-de-manana-en-vivo')
    expect(fileSlug('???')).toBe('gigsync')
  })
})
