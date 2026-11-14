import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveMonitorCard, type LiveMonitorCardProps } from '../LiveMonitorCard'

const props = (extra: Partial<LiveMonitorCardProps> = {}): LiveMonitorCardProps => ({
  enabled: true,
  onToggle: vi.fn(),
  role: 'lead',
  onRoleChange: vi.fn(),
  accessStatus: 'granted',
  inputs: [{ id: 'k', name: 'Minilab3 MIDI' }],
  inputId: 'k',
  onInputChange: vi.fn(),
  voiceLabels: { drums: 'Batería', bass: 'Bajo · Eléctrico', keys: 'Piano', lead: 'Saxo', arrangement: 'Cuerdas' },
  held: [],
  lastDrum: null,
  ...extra,
})

describe('LiveMonitorCard', () => {
  it('shows only the switch while it is off', () => {
    render(<LiveMonitorCard {...props({ enabled: false })} />)
    expect(screen.getByRole('switch', { name: 'Tocar con el controlador' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('offers the five roles, says what the chosen one sounds like and what is being played', async () => {
    const all = props({ held: [60, 64] })
    render(<LiveMonitorCard {...all} />)
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['Batería', 'Bajo', 'Piano', 'Melodía', 'Arreglos'])
    expect(screen.getByRole('radio', { name: 'Melodía' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Saxo')).toBeInTheDocument()
    expect(screen.getByTestId('live-monitor-sounding')).toHaveTextContent('C4 E4')

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Bajo' }))
    expect(all.onRoleChange).toHaveBeenCalledWith('bass')
  })

  it('names the drum a pad hit, and explains when there is no controller', () => {
    render(<LiveMonitorCard {...props({ inputs: [], inputId: null, lastDrum: { part: 'snare', count: 3 } })} />)
    expect(screen.getByTestId('live-monitor-sounding')).toHaveTextContent('Caja')
    expect(screen.getByRole('alert')).toHaveTextContent('No hay ningún controlador MIDI conectado')
    expect(screen.queryByLabelText('Controlador MIDI')).toBeNull()
  })
})
