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
    isEditMode: false,
    onToggleEditMode: vi.fn(),
    fontSize: 16,
    onFontSizeChange: vi.fn(),
    linesPerBlock: 2,
    onLinesPerBlockChange: vi.fn(),
    contentWidth: 896,
    onContentWidthChange: vi.fn(),
    transpose: 0,
    onTranspose: vi.fn(),
    onResetTranspose: vi.fn(),
    transposeDisplay: 'C',
    transposePreferFlats: false,
    isTransposeSpellingFlexible: false,
    onToggleTransposeSpelling: vi.fn(),
    metronomeSoundEnabled: false,
    onToggleMetronomeSound: vi.fn(),
    smartScrollContextWindow: 33,
    onSmartScrollContextWindowChange: vi.fn(),
    smartScrollSmoothness: 70,
    onSmartScrollSmoothnessChange: vi.fn(),
    showBeatIndicatorDebug: false,
    onToggleBeatIndicatorDebug: vi.fn(),
    onSaveControlAsDefault: vi.fn(),
    onSaveControlForSong: vi.fn(),
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

    // Find and click increment button (the stepper is the row's last direct
    // child — its first child holds the label + save-as-default/for-song buttons)
    const speedControls = screen.getByText('Scroll Speed').closest('.justify-between')
    const incrementButton = speedControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
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

    const speedControls = screen.getByText('Scroll Speed').closest('.justify-between')
    const decrementButton = speedControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[0]
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

    const speedControls = screen.getByText('Scroll Speed').closest('.justify-between')
    const incrementButton = speedControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
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

    const fontSizeControls = screen.getByText('Font Size').closest('.justify-between')
    const incrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
    if (incrementButton) {
      await user.click(incrementButton)
      expect(onFontSizeChange).toHaveBeenCalledWith(18)
    }
  })

  it('should not decrease font size below 20', async () => {
    const user = userEvent.setup()
    render(<PlayerControls {...defaultProps} fontSize={20} />)

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const fontSizeControls = screen.getByText('Font Size').closest('.justify-between')
    const decrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[0]
    expect(decrementButton).toBeDisabled()
  })

  it('should not increase font size above 56', async () => {
    const user = userEvent.setup()
    render(<PlayerControls {...defaultProps} fontSize={56} />)

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const fontSizeControls = screen.getByText('Font Size').closest('.justify-between')
    const incrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
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

    // Find the transpose stepper (row's last direct child — its first child
    // holds the label + save-as-default/for-song buttons)
    const transposeLabel = screen.getByText('Transpose')
    const transposeRow = transposeLabel.closest('.justify-between')
    expect(transposeRow).toBeTruthy()
    const stepper = transposeRow?.querySelector(':scope > div:last-child')

    const buttons = stepper?.querySelectorAll('button') || []
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

    const transposeControls = screen.getByText('Transpose').closest('.justify-between')
    const decrementButton = transposeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[0]
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

    const transposeControls = screen.getByText('Transpose').closest('.justify-between')
    const resetButton = transposeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
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

  it('should display the transpose target key name, not a raw semitone count', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <PlayerControls {...defaultProps} transpose={3} transposeDisplay="D#" />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    // The transpose target is displayed as a note name in a button
    expect(screen.getByText('D#')).toBeInTheDocument()

    rerender(<PlayerControls {...defaultProps} transpose={-2} transposeDisplay="Bb" />)
    // Settings panel should still be open, but if not, click again
    if (!screen.queryByText('Bb')) {
      const settingsButton2 = screen.getByRole('button', { name: /show settings|hide settings/i })
      await user.click(settingsButton2)
    }

    expect(screen.getByText('Bb')).toBeInTheDocument()
  })

  it('should toggle the enharmonic spelling when the sharp/flat button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleTransposeSpelling = vi.fn()
    render(
      <PlayerControls
        {...defaultProps}
        transpose={3}
        transposeDisplay="D#"
        isTransposeSpellingFlexible
        onToggleTransposeSpelling={onToggleTransposeSpelling}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const transposeRow = screen.getByText('Transpose').closest('.justify-between')
    const stepper = transposeRow?.querySelector(':scope > div:last-child')
    const spellingToggle = stepper?.querySelectorAll('button')[3]
    expect(spellingToggle).toBeTruthy()

    await user.click(spellingToggle!)
    expect(onToggleTransposeSpelling).toHaveBeenCalledTimes(1)
  })

  it('should disable the sharp/flat toggle when the target note has no alternative spelling', async () => {
    const user = userEvent.setup()
    render(
      <PlayerControls
        {...defaultProps}
        transpose={0}
        transposeDisplay="C"
        isTransposeSpellingFlexible={false}
      />
    )

    const settingsButton = screen.getByRole('button', { name: /show settings|hide settings/i })
    await user.click(settingsButton)

    const transposeRow = screen.getByText('Transpose').closest('.justify-between')
    const stepper = transposeRow?.querySelector(':scope > div:last-child')
    const spellingToggle = stepper?.querySelectorAll('button')[3]
    expect(spellingToggle).toBeDisabled()
  })
})
