import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PitchDisplay } from '../PitchDisplay'

describe('PitchDisplay', () => {
  it('should render with detected note', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440}
        cents={0}
        isActive={true}
      />
    )

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/440/)).toBeInTheDocument()
    expect(screen.getByText('0 cents')).toBeInTheDocument()
  })

  it('should render without note when inactive', () => {
    render(
      <PitchDisplay
        note={null}
        octave={null}
        frequency={null}
        cents={null}
        isActive={false}
      />
    )

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText('4')).not.toBeInTheDocument()
    expect(screen.getByText('--- Hz')).toBeInTheDocument()
    expect(screen.getByText('--- cents')).toBeInTheDocument()
  })

  it('should format frequency correctly', () => {
    const { rerender } = render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440.123}
        cents={0}
        isActive={true}
      />
    )

    expect(screen.getByText(/440\.12 Hz/)).toBeInTheDocument()

    rerender(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={1000.5}
        cents={0}
        isActive={true}
      />
    )

    expect(screen.getByText(/1000\.5 Hz/)).toBeInTheDocument()

    rerender(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={50.123}
        cents={0}
        isActive={true}
      />
    )

    expect(screen.getByText(/50\.12 Hz/)).toBeInTheDocument()
  })

  it('should format cents correctly', () => {
    const { rerender } = render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440}
        cents={0}
        isActive={true}
      />
    )

    expect(screen.getByText('0 cents')).toBeInTheDocument()

    rerender(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={442}
        cents={8}
        isActive={true}
      />
    )

    expect(screen.getByText('+8 cents')).toBeInTheDocument()

    rerender(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={438}
        cents={-8}
        isActive={true}
      />
    )

    expect(screen.getByText('-8 cents')).toBeInTheDocument()
  })

  it('should show in-tune indicator when cents <= 5', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440}
        cents={3}
        isActive={true}
      />
    )

    const centsElement = screen.getByText('+3 cents')
    expect(centsElement).toBeInTheDocument()
    expect(centsElement.closest('div')).toHaveClass('bg-emerald-100')
  })

  it('should show sharp indicator when cents > 5', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={442}
        cents={8}
        isActive={true}
      />
    )

    const centsElement = screen.getByText('+8 cents')
    expect(centsElement).toBeInTheDocument()
    expect(centsElement.closest('div')).toHaveClass('bg-amber-100')
  })

  it('should show flat indicator when cents < -5', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={438}
        cents={-8}
        isActive={true}
      />
    )

    const centsElement = screen.getByText('-8 cents')
    expect(centsElement).toBeInTheDocument()
    expect(centsElement.closest('div')).toHaveClass('bg-rose-100')
  })

  it('should show listening message when active but no note detected', () => {
    render(
      <PitchDisplay
        note={null}
        octave={null}
        frequency={null}
        cents={null}
        isActive={true}
      />
    )

    expect(screen.getByText('Listening for pitch...')).toBeInTheDocument()
  })

  it('should not show listening message when inactive', () => {
    render(
      <PitchDisplay
        note={null}
        octave={null}
        frequency={null}
        cents={null}
        isActive={false}
      />
    )

    expect(screen.queryByText('Listening for pitch...')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440}
        cents={0}
        isActive={true}
        className="custom-class"
      />
    )

    const rootElement = container.firstChild
    expect(rootElement).toHaveClass('custom-class')
  })

  it('should handle edge case: exactly 5 cents deviation', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={440.5}
        cents={5}
        isActive={true}
      />
    )

    const centsElement = screen.getByText('+5 cents')
    expect(centsElement).toBeInTheDocument()
    expect(centsElement.closest('div')).toHaveClass('bg-emerald-100')
  })

  it('should handle edge case: exactly -5 cents deviation', () => {
    render(
      <PitchDisplay
        note="A"
        octave={4}
        frequency={439.5}
        cents={-5}
        isActive={true}
      />
    )

    const centsElement = screen.getByText('-5 cents')
    expect(centsElement).toBeInTheDocument()
    expect(centsElement.closest('div')).toHaveClass('bg-emerald-100')
  })
})
