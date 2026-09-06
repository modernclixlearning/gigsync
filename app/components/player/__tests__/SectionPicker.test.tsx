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

describe('SectionPicker — free-text name + explicit type + "Estrofa" (gs#20)', () => {
  it('offers "Estrofa" as an option independent from "Verso", both mapped to the verse type', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<SectionPicker onSelect={onSelect} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Verso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estrofa' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Estrofa' }))
    expect(onSelect).toHaveBeenCalledWith('verse', 'Estrofa')
  })

  it('lets the user type a free section name and explicitly classify it by clicking a type button', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<SectionPicker onSelect={onSelect} onClose={onClose} />)

    await user.type(screen.getByLabelText('Nombre de sección libre'), 'Coro final')
    await user.click(screen.getByRole('button', { name: 'Break' }))

    // Explicit type wins over any name-based heuristic — the user picked "Break".
    expect(onSelect).toHaveBeenCalledWith('break', 'Coro final')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('highlights a suggested type from the typed name without forcing it as the only option', async () => {
    const user = userEvent.setup()
    render(<SectionPicker onSelect={vi.fn()} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Nombre de sección libre'), 'Estrofa 2')

    // getSectionType('Estrofa 2') resolves to 'verse' — the matching button is
    // highlighted as a suggestion, but every other button stays clickable.
    expect(screen.getByRole('button', { name: 'Verso' }).className).toMatch(/ring-2/)
    expect(screen.getByRole('button', { name: 'Break' })).not.toBeDisabled()
  })

  it('submits with the heuristic-suggested type on Enter when no button is explicitly clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<SectionPicker onSelect={onSelect} onClose={onClose} />)

    await user.type(screen.getByLabelText('Nombre de sección libre'), 'Estrofa 2{Enter}')

    expect(onSelect).toHaveBeenCalledWith('verse', 'Estrofa 2')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
