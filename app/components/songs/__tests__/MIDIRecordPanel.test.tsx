import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MIDIRecordPanel, defaultKeyboardInput } from '../MIDIRecordPanel'

describe('defaultKeyboardInput', () => {
  it('prefers the keyboard over virtual and control ports', () => {
    const inputs = [
      { id: '1', name: 'loopMIDI Port' },
      { id: '2', name: 'MCU/HUI' },
      { id: '3', name: 'Minilab3 MIDI' },
      { id: '4', name: 'DIN THRU' },
    ]
    expect(defaultKeyboardInput(inputs)?.name).toBe('Minilab3 MIDI')
  })

  it('falls back to the first port, or null without ports', () => {
    expect(defaultKeyboardInput([{ id: '1', name: 'loopMIDI Port' }])?.id).toBe('1')
    expect(defaultKeyboardInput([])).toBeNull()
  })
})

describe('MIDIRecordPanel', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'requestMIDIAccess')
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'requestMIDIAccess', original)
    else delete (navigator as unknown as Record<string, unknown>).requestMIDIAccess
  })

  it('explains when the browser has no Web MIDI', () => {
    delete (navigator as unknown as Record<string, unknown>).requestMIDIAccess
    render(<MIDIRecordPanel timeSignature="4/4" currentBpm={120} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Chrome o Edge')
    expect(screen.queryByRole('button', { name: /grabar/i })).toBeNull()
  })

  it('starts from the song key and shows the chosen one', async () => {
    const input = {
      id: 'k1',
      name: 'Minilab3 MIDI',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      open: vi.fn(() => Promise.resolve()),
    }
    const access = { inputs: new Map([['k1', input]]), addEventListener: vi.fn(), removeEventListener: vi.fn() }
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: vi.fn(() => Promise.resolve(access)),
    })
    render(
      <MIDIRecordPanel timeSignature="4/4" currentBpm={90} currentKey="Am" onApply={vi.fn()} onClose={vi.fn()} />,
    )
    const keySelect = await screen.findByLabelText('Tonalidad de la canción')
    expect(keySelect).toHaveValue('Am')
    fireEvent.change(keySelect, { target: { value: 'D' } })
    expect(screen.getByLabelText('Posición')).toHaveTextContent('D · 4/4 · 90 BPM')
  })
})
