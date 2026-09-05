import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SectionPicker } from '../SectionPicker'

describe('SectionPicker — icon-based redesign (gs#19)', () => {
  it('renders section options and the close button as SVG icons, not emoji glyphs', () => {
    const { container } = render(<SectionPicker onSelect={vi.fn()} onClose={vi.fn()} />)

    // No emoji glyphs left anywhere in the popover.
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u)

    // Close button renders an icon (svg), not the literal "✕" text.
    const closeButton = screen.getByRole('button', { name: 'Cerrar' })
    expect(closeButton.querySelector('svg')).toBeTruthy()
    expect(closeButton).not.toHaveTextContent('✕')

    // Every section option button renders an icon too.
    const optionButton = screen.getByRole('button', { name: 'Instrumental' })
    expect(optionButton.querySelector('svg')).toBeTruthy()
  })

  it('exposes a title attribute per option for long labels that may be truncated', () => {
    render(<SectionPicker onSelect={vi.fn()} onClose={vi.fn()} />)

    const optionButton = screen.getByRole('button', { name: 'Interludio' })
    expect(optionButton).toHaveAttribute('title', 'Interludio')
    expect(optionButton.querySelector('span')).toHaveClass('truncate')
  })

  it('does not use a fixed pixel width for the popover container', () => {
    const { container } = render(<SectionPicker onSelect={vi.fn()} onClose={vi.fn()} />)

    const popover = container.firstElementChild as HTMLElement
    expect(popover.className).not.toMatch(/w-\[\d+px\]/)
  })

  it('still selects a section type and closes on click, same as before the redesign', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<SectionPicker onSelect={onSelect} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Estribillo' }))

    expect(onSelect).toHaveBeenCalledWith('chorus', 'Estribillo')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
