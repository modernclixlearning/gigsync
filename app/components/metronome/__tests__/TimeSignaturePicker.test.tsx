import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeSignaturePicker, splitTimeSignature } from '../TimeSignaturePicker'
import { SongForm } from '~/components/songs/SongForm'
import type { CreateSongInput } from '~/types'

describe('splitTimeSignature', () => {
  it('reads the beats and the note that gets the beat', () => {
    expect(splitTimeSignature('12/8')).toEqual({ beats: 12, unit: 8 })
    expect(splitTimeSignature(' 3 / 4 ')).toEqual({ beats: 3, unit: 4 })
  })

  it('is null for anything that is not a signature', () => {
    for (const value of ['', 'abc', '4', '4/', '/4', '0/4', '4/0', null, undefined]) {
      expect(splitTimeSignature(value as string)).toBeNull()
    }
  })
})

describe('TimeSignaturePicker', () => {
  const options = (name: string) => within(screen.getByRole('combobox', { name })).getAllByRole('option').map((o) => o.textContent)

  it('offers 1 to 12 beats and the notes 2, 4 and 8', () => {
    render(<TimeSignaturePicker value="4/4" onChange={vi.fn()} />)
    expect(options('Tiempos por compás')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    expect(options('Figura que marca el tiempo')).toEqual(['2', '4', '8'])
  })

  it('shows the signature it has', () => {
    render(<TimeSignaturePicker value="7/8" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Tiempos por compás' })).toHaveValue('7')
    expect(screen.getByRole('combobox', { name: 'Figura que marca el tiempo' })).toHaveValue('8')
  })

  it('changing the beats keeps the note, and the other way round: 12/8 is two choices', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeSignaturePicker value="4/4" onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tiempos por compás' }), '12')
    expect(onChange).toHaveBeenLastCalledWith('12/4')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Figura que marca el tiempo' }), '8')
    expect(onChange).toHaveBeenLastCalledWith('4/8')
  })

  it('keeps a saved signature outside the ranges as a choice, so it is not changed by opening it', () => {
    render(<TimeSignaturePicker value="15/16" onChange={vi.fn()} />)
    expect(options('Tiempos por compás')).toContain('15')
    expect(options('Figura que marca el tiempo')).toEqual(['2', '4', '8', '16'])
    expect(screen.getByRole('combobox', { name: 'Tiempos por compás' })).toHaveValue('15')
    expect(screen.getByRole('combobox', { name: 'Figura que marca el tiempo' })).toHaveValue('16')
  })

  it('falls back to 4/4 for a value that is not a signature', () => {
    render(<TimeSignaturePicker value="raro" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Tiempos por compás' })).toHaveValue('4')
    expect(screen.getByRole('combobox', { name: 'Figura que marca el tiempo' })).toHaveValue('4')
  })
})

describe('SongForm time signature', () => {
  const data = { title: 'Canción', artist: 'Test', bpm: 100, key: 'C', timeSignature: '4/4', duration: 60, lyrics: '', tags: [] } as unknown as CreateSongInput

  it('lets the song take 12/8 by choosing 12 beats and the eighth note', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SongForm data={data} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tiempos por compás' }), '12')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ timeSignature: '12/4' }))
  })

  it('shows the song\'s signature', () => {
    render(<SongForm data={{ ...data, timeSignature: '11/8' }} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Tiempos por compás' })).toHaveValue('11')
    expect(screen.getByRole('combobox', { name: 'Figura que marca el tiempo' })).toHaveValue('8')
  })
})
