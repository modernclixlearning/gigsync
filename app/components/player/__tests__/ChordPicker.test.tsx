import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChordPicker, isMinorSuffix } from '../ChordPicker'

const setup = (currentChord: string) => {
  const onSelect = vi.fn()
  render(<ChordPicker currentChord={currentChord} onSelect={onSelect} onClose={vi.fn()} />)
  return { onSelect, user: userEvent.setup() }
}

const ring = () =>
  screen
    .getByRole('group', { name: 'Círculo de quintas' })
    .querySelectorAll('[role=button]')

describe('ChordPicker — circle of fifths', () => {
  it('lays the keys out in fifths, majors outside and their relative minors inside', () => {
    setup('C')
    const labels = [...ring()].map((el) => el.getAttribute('aria-label'))
    expect(labels.slice(0, 12)).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'])
    expect(labels.slice(12)).toEqual(['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Fm', 'Cm', 'Gm', 'Dm'])
  })

  it('spells the circle with flats when the chord has one, and the toggle switches it', async () => {
    const { user } = setup('Bb')
    const labels = () => [...ring()].map((el) => el.getAttribute('aria-label'))
    expect(labels().slice(6, 11)).toEqual(['Gb', 'Db', 'Ab', 'Eb', 'Bb'])
    expect(labels()).toContain('Gm')
    await user.click(screen.getByRole('button', { name: '♭→♯' }))
    expect(labels().slice(6, 11)).toEqual(['F#', 'C#', 'G#', 'D#', 'A#'])
  })

  it('marks the current chord on its ring', () => {
    setup('Am7')
    expect(screen.getByRole('button', { name: 'Am' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('an inner (minor) key makes a minor chord, applied with Aplicar', async () => {
    const { user, onSelect } = setup('C')
    await user.click(screen.getByRole('button', { name: 'Em' }))
    expect(onSelect).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onSelect).toHaveBeenLastCalledWith('Em')
  })

  it('keeps an extension of the same family and turns the triad into the other one', async () => {
    const seventh = setup('C7')
    await seventh.user.click(screen.getByRole('button', { name: 'G' }))
    await seventh.user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(seventh.onSelect).toHaveBeenLastCalledWith('G7')
  })

  it('moving from minor to the outer ring drops the m, from major to the inner ring adds it', async () => {
    const minor = setup('Am7')
    await minor.user.click(screen.getByRole('button', { name: 'Em' }))
    await minor.user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(minor.onSelect).toHaveBeenLastCalledWith('Em7') // same family: keeps m7
    await minor.user.click(screen.getByRole('button', { name: 'D' }))
    await minor.user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(minor.onSelect).toHaveBeenLastCalledWith('D') // minor → major: m7 becomes the triad
  })

  it('a quality still applies the chord on the chosen root', async () => {
    const { user, onSelect } = setup('D')
    await user.click(screen.getByRole('button', { name: 'F' }))
    expect(onSelect).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'maj7' }))
    expect(onSelect).toHaveBeenLastCalledWith('Fmaj7')
  })

  it('works from the keyboard', async () => {
    const { user, onSelect } = setup('C')
    screen.getByRole('button', { name: 'Dm' }).focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onSelect).toHaveBeenLastCalledWith('Dm')
  })
})

describe('isMinorSuffix', () => {
  it('tells minor-family suffixes from major ones', () => {
    for (const s of ['m', 'm7', 'm7b5', 'dim']) expect(isMinorSuffix(s)).toBe(true)
    for (const s of ['', '7', 'maj7', 'sus4', 'add9', '6', 'aug']) expect(isMinorSuffix(s)).toBe(false)
  })
})
