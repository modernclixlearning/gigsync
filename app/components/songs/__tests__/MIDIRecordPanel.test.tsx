import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
