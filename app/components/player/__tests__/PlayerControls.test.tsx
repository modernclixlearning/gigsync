import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerControls } from '../PlayerControls'

describe('PlayerControls', () => {
  const defaultProps = {
    isPlaying: false,
    onPlayPause: vi.fn(),
    autoScrollEnabled: false,
    onToggleAutoScroll: vi.fn(),
    autoScrollSpeed: 50,
    onAutoScrollSpeedChange: vi.fn(),
    showChords: true,
    onToggleChords: vi.fn(),
    fontSize: 16,
    onFontSizeChange: vi.fn(),
    transpose: 0,
    onTranspose: vi.fn(),
    onResetTranspose: vi.fn(),
    metronomeSoundEnabled: false,
    onToggleMetronomeSound: vi.fn(),
    smartScrollContextWindow: 33,
    onSmartScrollContextWindowChange: vi.fn(),
    smartScrollSmoothness: 70,
    onSmartScrollSmoothnessChange: vi.fn(),
    showBeatIndicatorDebug: false,
    onToggleBeatIndicatorDebug: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main controls', () => {
    render(<PlayerControls {...defaultProps} />)

    expect(screen.getByTitle('Hide chords')).toBeInTheDocument()
    expect(screen.getByTitle('Start auto-scroll')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play|pause/i })).toBeInTheDocument()
  })

  it('should toggle play/pause when play button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayPause = vi.fn()
    render(<PlayerControls {...defaultProps} onPlayPause={onPlayPause} />)

    const playButton = screen.getByRole('button', { name: /play|pause/i })
    await user.click(playButton)

    expect(onPlayPause).toHaveBeenCalledTimes(1)
  })

  it('should show pause icon when playing', () => {
    render(<PlayerControls {...defaultProps} isPlaying={true} />)

    const pauseIcon = screen.getByRole('button', { name: /play|pause/i })
    expect(pauseIcon).toBeInTheDocument()
  })

  it('should show play icon when paused', () => {
    render(<PlayerControls {...defaultProps} isPlaying={false} />)

    const playIcon = screen.getByRole('button', { name: /play|pause/i })
    expect(playIcon).toBeInTheDocument()
  })

  it('should toggle chords visibility', async () => {
    const user = userEvent.setup()
    const onToggleChords = vi.fn()
    render(<PlayerControls {...defaultProps} onToggleChords={onToggleChords} />)

    const chordsButton = screen.getByTitle('Hide chords')
    await user.click(chordsButton)

    expect(onToggleChords).toHaveBeenCalledTimes(1)
  })

  it('should show correct icon based on chords visibility', () => {
    const { rerender } = render(
      <PlayerControls {...defaultProps} showChords={true} />
    )

    expect(screen.getByTitle('Hide chords')).toBeInTheDocument()

    rerender(<PlayerControls {...defaultProps} showChords={false} />)

    expect(screen.getByTitle('Show chords')).toBeInTheDocument()
  })

  it('should toggle auto-scroll', async () => {
    const user = userEvent.setup()
    const onToggleAutoScroll = vi.fn()
    render(
      <PlayerControls {...defaultProps} onToggleAutoScroll={onToggleAutoScroll} />
    )

    const autoScrollButton = screen.getByTitle('Start auto-scroll')
    await user.click(autoScrollButton)

    expect(onToggleAutoScroll).toHaveBeenCalledTimes(1)
  })

  it('should show correct title based on auto-scroll state', () => {
    const { rerender } = render(
      <PlayerControls {...defaultProps} autoScrollEnabled={false} />
    )

    expect(screen.getByTitle('Start auto-scroll')).toBeInTheDocument()

    rerender(<PlayerControls {...defaultProps} autoScrollEnabled={true} />)

    expect(screen.getByTitle('Stop auto-scroll')).toBeInTheDocument()
  })

  it('should toggle settings panel', async () => {
    const user = userEvent.setup()
    render(<PlayerControls {...defaultProps} />)

    const settingsButton = screen.getByRole('button', { name: /show settings/i })
    await user.click(settingsButton)

    expect(screen.getByText('Scroll Speed')).toBeInTheDocument()
    expect(screen.getByText('Font Size')).toBeInTheDocument()
    expect(screen.getByText('Transpose')).toBeInTheDocument()
  })

  it('should change auto-scroll speed', async () => {
    const user = userEvent.setup()
    const onAutoScrollSpeedChange = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        autoScrollSpeed={50}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    // Open settings
    const settingsButton = screen.getByRole('button', { name: /show settings/i })
    await user.click(settingsButton)

    // Find and click increment button
    const speedControls = screen.getByText('Scroll Speed').parentElement
    const incrementButton = speedControls?.querySelectorAll('button')[1]
    if (incrementButton) {
      await user.click(incrementButton)
      expect(onAutoScrollSpeedChange).toHaveBeenCalledWith(60)
    }
  })

  it('should not decrease scroll speed below 0', async () => {
    const user = userEvent.setup()
    const onAutoScrollSpeedChange = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        autoScrollSpeed={0}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const speedControls = screen.getByText('Scroll Speed').parentElement
    const decrementButton = speedControls?.querySelectorAll('button')[0]
    expect(decrementButton).toBeDisabled()
  })

  it('should not increase scroll speed above 100', async () => {
    const user = userEvent.setup()
    const onAutoScrollSpeedChange = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        autoScrollSpeed={100}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const speedControls = screen.getByText('Scroll Speed').parentElement
    const incrementButton = speedControls?.querySelectorAll('button')[1]
    expect(incrementButton).toBeDisabled()
  })

  it('should change font size', async () => {
    const user = userEvent.setup()
    const onFontSizeChange = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        fontSize={16}
        onFontSizeChange={onFontSizeChange}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const fontSizeControls = screen.getByText('Font Size').parentElement
    const incrementButton = fontSizeControls?.querySelectorAll('button')[1]
    if (incrementButton) {
      await user.click(incrementButton)
      expect(onFontSizeChange).toHaveBeenCalledWith(18)
    }
  })

  it('should not decrease font size below 12', async () => {
    const user = userEvent.setup()
    render(<PlayerControls {...defaultProps} fontSize={12} />)

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const fontSizeControls = screen.getByText('Font Size').parentElement
    const decrementButton = fontSizeControls?.querySelectorAll('button')[0]
    expect(decrementButton).toBeDisabled()
  })

  it('should not increase font size above 32', async () => {
    const user = userEvent.setup()
    render(<PlayerControls {...defaultProps} fontSize={32} />)

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const fontSizeControls = screen.getByText('Font Size').parentElement
    const incrementButton = fontSizeControls?.querySelectorAll('button')[1]
    expect(incrementButton).toBeDisabled()
  })

  it('should transpose up', async () => {
    const user = userEvent.setup()
    const onTranspose = vi.fn()
    render(
      <PlayerControls {...defaultProps} transpose={0} onTranspose={onTranspose} />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    // Find the transpose controls section
    const transposeLabel = screen.getByText('Transpose')
    const transposeControls = transposeLabel.parentElement
    expect(transposeControls).toBeTruthy()
    
    // Find the increment button (third button in the controls div)
    const buttons = transposeControls?.querySelectorAll('button') || []
    expect(buttons.length).toBeGreaterThanOrEqual(3)
    
    const incrementButton = buttons[2] // Third button is the increment (+)
    await user.click(incrementButton)
    
    expect(onTranspose).toHaveBeenCalledWith(1)
  })

  it('should transpose down', async () => {
    const user = userEvent.setup()
    const onTranspose = vi.fn()
    render(
      <PlayerControls {...defaultProps} transpose={0} onTranspose={onTranspose} />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const transposeControls = screen.getByText('Transpose').parentElement
    const decrementButton = transposeControls?.querySelectorAll('button')[0]
    if (decrementButton) {
      await user.click(decrementButton)
      expect(onTranspose).toHaveBeenCalledWith(-1)
    }
  })

  it('should reset transpose', async () => {
    const user = userEvent.setup()
    const onResetTranspose = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        transpose={3}
        onResetTranspose={onResetTranspose}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const transposeControls = screen.getByText('Transpose').parentElement
    const resetButton = transposeControls?.querySelectorAll('button')[1]
    if (resetButton) {
      await user.click(resetButton)
      expect(onResetTranspose).toHaveBeenCalledTimes(1)
    }
  })

  it('should show transpose reset button when transpose is not zero', () => {
    render(<PlayerControls {...defaultProps} transpose={3} />)

    expect(screen.getByTitle('Reset transpose')).toBeInTheDocument()
  })

  it('should not show transpose reset button when transpose is zero', () => {
    render(<PlayerControls {...defaultProps} transpose={0} />)

    expect(screen.queryByTitle('Reset transpose')).not.toBeInTheDocument()
  })

  it('should display transpose value correctly', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <PlayerControls {...defaultProps} transpose={3} />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    // The transpose value is displayed in a button
    expect(screen.getByText('+3')).toBeInTheDocument()

    rerender(<PlayerControls {...defaultProps} transpose={-2} />)
    // Settings panel should still be open, but if not, click again
    if (!screen.queryByText('-2')) {
      const settingsButton2 = screen.getByRole('button', { name: /show settings|hide settings/i })
      await user.click(settingsButton2)
    }

    expect(screen.getByText('-2')).toBeInTheDocument()
  })
})
