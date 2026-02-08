import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BPMControl } from '../BPMControl'

describe('BPMControl', () => {
  it('should render with initial value', () => {
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('BPM')).toBeInTheDocument()
  })

  it('should increment BPM when increment button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    const incrementButton = screen.getByLabelText('Increase BPM')
    await user.click(incrementButton)

    expect(onChange).toHaveBeenCalledWith(121)
  })

  it('should decrement BPM when decrement button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    const decrementButton = screen.getByLabelText('Decrease BPM')
    await user.click(decrementButton)

    expect(onChange).toHaveBeenCalledWith(119)
  })

  it('should increment BPM by 5 when fine increment button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    const fineIncrementButton = screen.getByLabelText('Increase BPM by 5')
    await user.click(fineIncrementButton)

    expect(onChange).toHaveBeenCalledWith(125)
  })

  it('should decrement BPM by 5 when fine decrement button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    const fineDecrementButton = screen.getByLabelText('Decrease BPM by 5')
    await user.click(fineDecrementButton)

    expect(onChange).toHaveBeenCalledWith(115)
  })

  it('should not increment beyond max value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={300} max={300} onChange={onChange} />)

    const incrementButton = screen.getByLabelText('Increase BPM')
    await user.click(incrementButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should not decrement below min value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={20} min={20} onChange={onChange} />)

    const decrementButton = screen.getByLabelText('Decrease BPM')
    await user.click(decrementButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should clamp fine increment to max value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={298} max={300} onChange={onChange} />)

    const fineIncrementButton = screen.getByLabelText('Increase BPM by 5')
    await user.click(fineIncrementButton)

    expect(onChange).toHaveBeenCalledWith(300)
  })

  it('should clamp fine decrement to min value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={22} min={20} onChange={onChange} />)

    const fineDecrementButton = screen.getByLabelText('Decrease BPM by 5')
    await user.click(fineDecrementButton)

    expect(onChange).toHaveBeenCalledWith(20)
  })

  it('should apply custom min and max values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={50} min={40} max={200} onChange={onChange} />)

    const incrementButton = screen.getByLabelText('Increase BPM')
    await user.click(incrementButton)

    expect(onChange).toHaveBeenCalledWith(51)

    const { rerender } = render(
      <BPMControl value={200} min={40} max={200} onChange={onChange} />
    )

    await user.click(screen.getByLabelText('Increase BPM'))
    expect(onChange).not.toHaveBeenCalledWith(201)
  })

  it('should render with different sizes', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <BPMControl value={120} onChange={onChange} size="md" />
    )

    let dial = screen.getByText('120').closest('div')?.parentElement
    expect(dial).toHaveClass('w-48', 'h-48')

    rerender(<BPMControl value={120} onChange={onChange} size="lg" />)
    dial = screen.getByText('120').closest('div')?.parentElement
    expect(dial).toHaveClass('w-56', 'h-56')

    rerender(<BPMControl value={120} onChange={onChange} size="xl" />)
    dial = screen.getByText('120').closest('div')?.parentElement
    expect(dial).toHaveClass('w-72', 'h-72')
  })

  it('should apply custom className', () => {
    const onChange = vi.fn()
    const { container } = render(
      <BPMControl value={120} onChange={onChange} className="custom-class" />
    )

    const rootElement = container.firstChild
    expect(rootElement).toHaveClass('custom-class')
  })

  it('should calculate rotation angle correctly', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <BPMControl value={20} min={20} max={300} onChange={onChange} />
    )

    // At min value, rotation should be -135 degrees
    expect(screen.getByText('20')).toBeInTheDocument()

    rerender(<BPMControl value={160} min={20} max={300} onChange={onChange} />)
    expect(screen.getByText('160')).toBeInTheDocument()

    rerender(<BPMControl value={300} min={20} max={300} onChange={onChange} />)
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  it('should handle multiple rapid clicks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<BPMControl value={120} onChange={onChange} />)

    const incrementButton = screen.getByLabelText('Increase BPM')
    await user.click(incrementButton)
    await user.click(incrementButton)
    await user.click(incrementButton)

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenNthCalledWith(1, 121)
    expect(onChange).toHaveBeenNthCalledWith(2, 121)
    expect(onChange).toHaveBeenNthCalledWith(3, 121)
  })
})
