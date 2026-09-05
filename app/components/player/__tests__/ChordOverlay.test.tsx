import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChordOverlay } from '../ChordOverlay'

describe('ChordOverlay — inline insert controls (gs#17)', () => {
  it('renders "+ Linea" and "+ Sección" with matching box + focus-visible ring styles', () => {
    render(<ChordOverlay lyrics={'[C]Hola mundo'} isEditable />)

    const addLineButtons = screen.getAllByRole('button', { name: '+ Linea' })
    const addSectionButtons = screen.getAllByRole('button', { name: '+ Sección' })

    expect(addLineButtons.length).toBeGreaterThan(0)
    expect(addSectionButtons.length).toBeGreaterThan(0)

    for (const button of [...addLineButtons, ...addSectionButtons]) {
      // Same box model (size/shape) for both controls.
      expect(button).toHaveClass('text-xs', 'px-2', 'py-1', 'rounded-full')
      // Custom focus-visible ring instead of the browser default outline —
      // otherwise "+ Sección" looks bigger/shifted while it keeps focus with
      // the SectionPicker popover open (gs#17 root cause).
      expect(button).toHaveClass('focus:outline-none', 'focus-visible:ring-2')
      // Both controls sit inside an identical `relative` wrapper so the
      // wrapper needed to anchor the SectionPicker popover doesn't introduce
      // a layout difference versus "+ Linea".
      expect(button.parentElement).toHaveClass('relative')
    }
  })
})
