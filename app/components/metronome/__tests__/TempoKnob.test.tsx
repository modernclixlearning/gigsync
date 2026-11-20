import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TempoKnob, angleToBpm, bpmToAngle, pointAngle, tempoName } from '../TempoKnob'

// jsdom has no PointerEvent: without it clientX/pointerId are dropped.
beforeAll(() => {
  if (typeof window.PointerEvent === 'function') return
  class FakePointerEvent extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
  window.PointerEvent = FakePointerEvent as unknown as typeof PointerEvent
})

describe('knob geometry', () => {
  it('turns 270° from the lowest to the highest tempo', () => {
    expect(bpmToAngle(20)).toBe(-135)
    expect(bpmToAngle(300)).toBe(135)
    expect(bpmToAngle(160)).toBe(0)
  })

  it('maps an angle back to a whole tempo, and sticks to the ends in the dead zone', () => {
    expect(angleToBpm(0)).toBe(160)
    expect(angleToBpm(-135)).toBe(20)
    expect(angleToBpm(135)).toBe(300)
    expect(angleToBpm(170)).toBe(300)
    expect(angleToBpm(-170)).toBe(20)
    for (const bpm of [20, 61, 120, 187, 300]) expect(angleToBpm(bpmToAngle(bpm))).toBe(bpm)
  })

  it('reads the angle of a point from the top, clockwise', () => {
    expect(pointAngle(0, -10)).toBeCloseTo(0)
    expect(pointAngle(10, 0)).toBeCloseTo(90)
    expect(pointAngle(-10, 0)).toBeCloseTo(-90)
    expect(Math.abs(pointAngle(0, 10))).toBeCloseTo(180)
  })

  it('names the tempo', () => {
    expect([50, 70, 100, 118, 130, 170, 190, 210].map(tempoName)).toEqual([
      'Largo',
      'Adagio',
      'Andante',
      'Moderato',
      'Allegro',
      'Vivace',
      'Presto',
      'Prestissimo',
    ])
  })
})

describe('TempoKnob', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }))
  afterEach(() => vi.useRealTimers())

  it('is the size of the tuner dial and shows the tempo in its centre', () => {
    const { container } = render(<TempoKnob value={120} onChange={vi.fn()} />)
    const box = container.firstElementChild as HTMLElement
    expect(box.style.width).toBe('280px')
    expect(box.style.height).toBe('280px')
    expect(screen.getByRole('button', { name: 'Marcar el tempo con toques' })).toHaveTextContent('120')
    expect(screen.getByRole('button', { name: 'Marcar el tempo con toques' })).toHaveTextContent('Allegro')
  })

  it('is a slider for the tempo, with its value and range for assistive technology', () => {
    render(<TempoKnob value={120} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: 'Tempo' })
    expect(slider).toHaveAttribute('aria-valuemin', '20')
    expect(slider).toHaveAttribute('aria-valuemax', '300')
    expect(slider).toHaveAttribute('aria-valuenow', '120')
    expect(slider).toHaveAttribute('aria-valuetext', '120 BPM, Allegro')
  })

  it('turns with the keyboard: arrows by one, Shift or Page by ten, Home and End to the ends', () => {
    const onChange = vi.fn()
    render(<TempoKnob value={120} onChange={onChange} />)
    const slider = screen.getByRole('slider', { name: 'Tempo' })
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    expect(onChange).toHaveBeenLastCalledWith(121)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(119)
    fireEvent.keyDown(slider, { key: 'ArrowUp', shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith(130)
    fireEvent.keyDown(slider, { key: 'PageDown' })
    expect(onChange).toHaveBeenLastCalledWith(110)
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith(20)
    fireEvent.keyDown(slider, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith(300)
  })

  it('never goes past its ends with the keyboard', () => {
    const onChange = vi.fn()
    render(<TempoKnob value={298} onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Tempo' }), { key: 'ArrowUp', shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith(300)
  })

  it('turns by dragging the ring: a point to the right of the centre is the middle-high tempo', () => {
    const onChange = vi.fn()
    render(<TempoKnob value={120} onChange={onChange} />)
    const slider = screen.getByRole('slider', { name: 'Tempo' })
    // jsdom has no layout: the ring is a 280 px box at the origin, its centre at (140, 140).
    slider.getBoundingClientRect = () => ({ left: 0, top: 0, right: 280, bottom: 280, width: 280, height: 280, x: 0, y: 0, toJSON: () => ({}) })

    fireEvent.pointerDown(slider, { clientX: 140, clientY: 20, pointerId: 1, button: 0 }) // straight up
    expect(onChange).toHaveBeenLastCalledWith(160)
    fireEvent.pointerMove(slider, { clientX: 260, clientY: 140, pointerId: 1 }) // 90° right
    expect(onChange).toHaveBeenLastCalledWith(Math.round(20 + (225 / 270) * 280))
    fireEvent.pointerMove(slider, { clientX: 20, clientY: 140, pointerId: 1 }) // 90° left
    expect(onChange).toHaveBeenLastCalledWith(Math.round(20 + (45 / 270) * 280))
    fireEvent.pointerUp(slider, { pointerId: 1 })
    onChange.mockClear()
    fireEvent.pointerMove(slider, { clientX: 140, clientY: 20, pointerId: 1 }) // released: nothing
    expect(onChange).not.toHaveBeenCalled()
  })

  it('taps the tempo from the centre, applying it from the second tap', () => {
    const onChange = vi.fn()
    render(<TempoKnob value={120} onChange={onChange} />)
    const centre = screen.getByRole('button', { name: 'Marcar el tempo con toques' })

    fireEvent.click(centre)
    expect(onChange).not.toHaveBeenCalled()
    expect(centre).toHaveTextContent('sigue el pulso')

    vi.advanceTimersByTime(500) // 500 ms between taps = 120 BPM; 600 ms = 100 BPM
    fireEvent.click(centre)
    expect(onChange).toHaveBeenLastCalledWith(120)
    vi.advanceTimersByTime(600)
    fireEvent.click(centre)
    expect(onChange).toHaveBeenLastCalledWith(Math.round(60000 / 550))
    expect(centre).toHaveTextContent('marcando')
  })

  it('tapping the centre does not turn the ring', async () => {
    vi.useRealTimers()
    const onChange = vi.fn()
    render(<TempoKnob value={120} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Marcar el tempo con toques' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
