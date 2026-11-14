import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BandTrackCards } from '../BandTrackCards'
import type { SongBand } from '~/lib/audio/bandPatterns'

const note = { beat: 0, beats: 1, pitch: 60, velocity: 0.7 }

const setup = (band?: SongBand) => {
  const onChange = vi.fn()
  const onEdit = vi.fn()
  render(<BandTrackCards band={band} onChange={onChange} onEdit={onEdit} />)
  return { onChange, onEdit, user: userEvent.setup() }
}

describe('BandTrackCards', () => {
  it('offers to write each track while it is empty, with no level to set', async () => {
    const { user, onEdit } = setup()
    const lead = within(screen.getByRole('region', { name: 'Melodía' }))
    expect(lead.getByText(/Sin escribir/)).toBeInTheDocument()
    expect(lead.queryByRole('slider')).toBeNull()
    await user.click(within(screen.getByRole('region', { name: 'Arreglos' })).getByRole('button', { name: 'Escribir o grabar' }))
    expect(onEdit).toHaveBeenCalledWith('arrangement')
  })

  it('shows the sound and the notes of a written track, and saves its level and its mute with the band', async () => {
    const band: SongBand = { bassRhythm: 'X...x...x...x...', lead: { voice: 'sax', notes: [note, { ...note, beat: 2 }] } }
    const { user, onChange } = setup(band)
    const lead = within(screen.getByRole('region', { name: 'Melodía' }))
    expect(lead.getByText('Saxo · 2 notas')).toBeInTheDocument()

    fireEvent.change(lead.getByRole('slider', { name: 'Volumen: melodía' }), { target: { value: '35' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...band, lead: { ...band.lead, volume: 35 } })

    await user.click(lead.getByRole('switch', { name: 'Suena: melodía' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...band, lead: { ...band.lead, muted: true } })
  })
})
