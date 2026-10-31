import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlayerControls } from '../PlayerControls'
import { PlayerAdjustments } from '../PlayerAdjustments'

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
    onSaveControlForSetlist: vi.fn(),
    onSaveControlsAsDefault: vi.fn(),
    onSaveControlsForSong: vi.fn(),
    onSaveControlsForSetlist: vi.fn(),
    canSaveForSetlist: false,
    chordFontSize: 26,
    onChordFontSizeChange: vi.fn(),
    beatHighlightMode: 'text' as const,
    onBeatHighlightModeChange: vi.fn(),
    beatHighlightTextColor: '#38bdf8',
    onBeatHighlightTextColorChange: vi.fn(),
    beatHighlightBgColor: 'rgba(56, 189, 248, 0.35)',
    onBeatHighlightBgColorChange: vi.fn(),
    beatHighlightGlowIntensity: 100,
    onBeatHighlightGlowIntensityChange: vi.fn(),
    beatHighlightGlowColor: null,
    onBeatHighlightGlowColorChange: vi.fn(),
    chordHighlightMode: 'text' as const,
    onChordHighlightModeChange: vi.fn(),
    chordTextColor: null,
    onChordTextColorChange: vi.fn(),
    chordBgColor: null,
    onChordBgColorChange: vi.fn(),
    backgroundColor: null,
    onBackgroundColorChange: vi.fn(),
    lyricsTextColor: null,
    onLyricsTextColorChange: vi.fn(),
    textAlign: 'left' as const,
    onTextAlignChange: vi.fn(),
    isSettingsOpen: false,
    onToggleSettings: vi.fn(),
    onRestart: vi.fn(),
    isCountInOn: false,
    onToggleCountIn: vi.fn(),
    isCountingIn: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main controls', () => {
    render(<PlayerControls {...defaultProps} />)

    expect(screen.getByTitle('Hide chords')).toBeInTheDocument()
    expect(screen.getByTitle('Start auto-scroll')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^(play|pause)$/i })).toBeInTheDocument()
  })

  it('offers "Escuchar acordes" next to the metronome, only with smart autoscroll', async () => {
    const onToggleChordSound = vi.fn()
    const { rerender } = render(
      <PlayerControls {...defaultProps} chordSoundEnabled={false} onToggleChordSound={onToggleChordSound} />
    )
    expect(screen.queryByRole('button', { name: 'Escuchar acordes' })).toBeNull()

    rerender(
      <PlayerControls
        {...defaultProps}
        autoScrollEnabled
        chordSoundEnabled={false}
        onToggleChordSound={onToggleChordSound}
      />
    )
    const toggle = screen.getByRole('button', { name: 'Escuchar acordes' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(onToggleChordSound).toHaveBeenCalledTimes(1)

    rerender(
      <PlayerControls {...defaultProps} autoScrollEnabled chordSoundEnabled onToggleChordSound={onToggleChordSound} />
    )
    expect(screen.getByRole('button', { name: 'Escuchar acordes' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('should toggle play/pause when play button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayPause = vi.fn()
    render(<PlayerControls {...defaultProps} onPlayPause={onPlayPause} />)

    const playButton = screen.getByRole('button', { name: /^(play|pause)$/i })
    await user.click(playButton)

    expect(onPlayPause).toHaveBeenCalledTimes(1)
  })

  it('should show pause icon when playing', () => {
    render(<PlayerControls {...defaultProps} isPlaying={true} />)

    const pauseIcon = screen.getByRole('button', { name: /^(play|pause)$/i })
    expect(pauseIcon).toBeInTheDocument()
  })

  it('should show play icon when paused', () => {
    render(<PlayerControls {...defaultProps} isPlaying={false} />)

    const playIcon = screen.getByRole('button', { name: /^(play|pause)$/i })
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

  it('should toggle the side panel from the settings button', async () => {
    const user = userEvent.setup()
    const onToggleSettings = vi.fn()
    const { rerender } = render(
      <PlayerControls {...defaultProps} onToggleSettings={onToggleSettings} />
    )

    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(onToggleSettings).toHaveBeenCalledTimes(1)

    rerender(<PlayerControls {...defaultProps} isSettingsOpen onToggleSettings={onToggleSettings} />)
    expect(screen.getByRole('button', { name: 'Cerrar ajustes' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('restarts the song from the top', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(<PlayerControls {...defaultProps} onRestart={onRestart} />)
    await user.click(screen.getByRole('button', { name: 'Desde el inicio' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('the count-in is a toggle that stays on, also while playing', async () => {
    const user = userEvent.setup()
    const onToggleCountIn = vi.fn()
    const { rerender } = render(<PlayerControls {...defaultProps} onToggleCountIn={onToggleCountIn} />)
    const toggle = () => screen.getByRole('button', { name: 'Precuenta' })
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle())
    expect(onToggleCountIn).toHaveBeenCalledTimes(1)

    rerender(<PlayerControls {...defaultProps} isCountInOn onToggleCountIn={onToggleCountIn} isPlaying />)
    expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(toggle()).toBeEnabled()
  })

  it('shows "next song" only when there is one', async () => {
    const user = userEvent.setup()
    const onNextSong = vi.fn()
    const { rerender } = render(<PlayerControls {...defaultProps} />)
    expect(screen.queryByRole('button', { name: 'Siguiente canción' })).toBeNull()

    rerender(<PlayerControls {...defaultProps} onNextSong={onNextSong} />)
    await user.click(screen.getByRole('button', { name: 'Siguiente canción' }))
    expect(onNextSong).toHaveBeenCalledTimes(1)
  })

  it('softens the highlight glow and saves it with the rest of the highlight', async () => {
    const user = userEvent.setup()
    const onBeatHighlightGlowIntensityChange = vi.fn()
    const onSaveControlsForSong = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        beatHighlightGlowIntensity={60}
        onBeatHighlightGlowIntensityChange={onBeatHighlightGlowIntensityChange}
        onSaveControlsForSong={onSaveControlsForSong}
      />
    )
    const row = screen.getByText('Resaltado del beat').closest('[data-testid="settings-row"]') as HTMLElement
    const slider = row.querySelector<HTMLInputElement>('input[type="range"]')!
    expect(slider.value).toBe('60')
    fireEvent.change(slider, { target: { value: '30' } })
    expect(onBeatHighlightGlowIntensityChange).toHaveBeenCalledWith(30)

    await user.click(within(row).getByTitle('Guardar solo para esta canción'))
    expect(onSaveControlsForSong).toHaveBeenCalledWith(
      expect.objectContaining({ beatHighlightGlowIntensity: 60, beatHighlightGlowColor: '#38bdf8' })
    )
  })

  it('offers to reset a custom glow color back to the text color', async () => {
    const user = userEvent.setup()
    const onBeatHighlightGlowColorChange = vi.fn()
    const { rerender } = render(<PlayerAdjustments {...defaultProps} />)
    const row = () => screen.getByText('Resaltado del beat').closest('[data-testid="settings-row"]') as HTMLElement
    expect(within(row()).queryByTitle('Restaurar color por defecto')).toBeNull()

    rerender(
      <PlayerAdjustments
        {...defaultProps}
        beatHighlightGlowColor="#000000"
        onBeatHighlightGlowColorChange={onBeatHighlightGlowColorChange}
      />
    )
    await user.click(within(row()).getByTitle('Restaurar color por defecto'))
    expect(onBeatHighlightGlowColorChange).toHaveBeenCalledWith(null)
  })

  it('sets the lyric and the chord highlight modes independently', async () => {
    const user = userEvent.setup()
    const onBeatHighlightModeChange = vi.fn()
    const onChordHighlightModeChange = vi.fn()
    const onSaveControlsForSong = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        beatHighlightMode="text"
        chordHighlightMode="background"
        onBeatHighlightModeChange={onBeatHighlightModeChange}
        onChordHighlightModeChange={onChordHighlightModeChange}
        onSaveControlsForSong={onSaveControlsForSong}
      />
    )
    const lyric = screen.getByRole('group', { name: 'Resaltado de letra' })
    const chords = screen.getByRole('group', { name: 'Resaltado de acordes' })
    expect(within(lyric).getByRole('button', { name: 'Color' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(chords).getByRole('button', { name: 'Fondo' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(chords).getByRole('button', { name: 'Color' }))
    expect(onChordHighlightModeChange).toHaveBeenCalledWith('text')
    expect(onBeatHighlightModeChange).not.toHaveBeenCalled()

    const row = screen.getByText('Resaltado del beat').closest('[data-testid="settings-row"]') as HTMLElement
    await user.click(within(row).getByTitle('Guardar solo para esta canción'))
    expect(onSaveControlsForSong).toHaveBeenCalledWith(
      expect.objectContaining({ beatHighlightMode: 'text', chordHighlightMode: 'background' })
    )
  })

  it('sets the chord colors and saves only the ones that were customized', async () => {
    const user = userEvent.setup()
    const onChordBgColorChange = vi.fn()
    const onSaveControlsAsDefault = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        chordTextColor="#ffffff"
        onChordBgColorChange={onChordBgColorChange}
        onSaveControlsAsDefault={onSaveControlsAsDefault}
      />
    )
    const row = screen.getByText('Colores de acordes').closest('[data-testid="settings-row"]') as HTMLElement
    const [textInput, bgInput] = row.querySelectorAll<HTMLInputElement>('input[type="color"]')
    expect(textInput.value).toBe('#ffffff')
    fireEvent.change(bgInput, { target: { value: '#112233' } })
    expect(onChordBgColorChange).toHaveBeenCalledWith('#112233')

    await user.click(within(row).getByTitle('Guardar como default de toda la librería'))
    expect(onSaveControlsAsDefault).toHaveBeenCalledWith({ chordTextColor: '#ffffff', chordBgColor: undefined })
  })

  it('sets the song alignment and saves it for the song', async () => {
    const user = userEvent.setup()
    const onTextAlignChange = vi.fn()
    const onSaveControlForSong = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        textAlign="center"
        onTextAlignChange={onTextAlignChange}
        onSaveControlForSong={onSaveControlForSong}
      />
    )
    expect(screen.getByRole('button', { name: 'Centrar' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Alinear a la derecha' }))
    expect(onTextAlignChange).toHaveBeenCalledWith('right')

    const row = screen.getByText('Alineación', { selector: 'p' }).closest('[data-testid="settings-row"]') as HTMLElement
    await user.click(within(row).getByTitle('Guardar solo para esta canción'))
    expect(onSaveControlForSong).toHaveBeenCalledWith('textAlign', 'center')
  })

  it('should render the adjustments rows', () => {
    render(<PlayerAdjustments {...defaultProps} />)

    expect(screen.getByText('Scroll Speed')).toBeInTheDocument()
    expect(screen.getByText('Font Size')).toBeInTheDocument()
    expect(screen.getByText('Transpose')).toBeInTheDocument()
  })

  it('should change auto-scroll speed', async () => {
    const user = userEvent.setup()
    const onAutoScrollSpeedChange = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        autoScrollSpeed={50}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    // Find and click increment button (the stepper is the row's last direct
    // child — its first child holds the label + save-as-default/for-song buttons)
    const speedControls = screen.getByText('Scroll Speed').closest('[data-testid="settings-row"]')
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
      <PlayerAdjustments
        {...defaultProps}
        autoScrollSpeed={0}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    const speedControls = screen.getByText('Scroll Speed').closest('[data-testid="settings-row"]')
    const decrementButton = speedControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[0]
    expect(decrementButton).toBeDisabled()
  })

  it('should not increase scroll speed above 100', async () => {
    const user = userEvent.setup()
    const onAutoScrollSpeedChange = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        autoScrollSpeed={100}
        onAutoScrollSpeedChange={onAutoScrollSpeedChange}
      />
    )

    const speedControls = screen.getByText('Scroll Speed').closest('[data-testid="settings-row"]')
    const incrementButton = speedControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
    expect(incrementButton).toBeDisabled()
  })

  it('should change font size', async () => {
    const user = userEvent.setup()
    const onFontSizeChange = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        fontSize={16}
        onFontSizeChange={onFontSizeChange}
      />
    )

    const fontSizeControls = screen.getByText('Font Size').closest('[data-testid="settings-row"]')
    const incrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
    if (incrementButton) {
      await user.click(incrementButton)
      expect(onFontSizeChange).toHaveBeenCalledWith(18)
    }
  })

  it('should not decrease font size below 20', async () => {
    const user = userEvent.setup()
    render(<PlayerAdjustments {...defaultProps} fontSize={20} />)

    const fontSizeControls = screen.getByText('Font Size').closest('[data-testid="settings-row"]')
    const decrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[0]
    expect(decrementButton).toBeDisabled()
  })

  it('should not increase font size above 56', async () => {
    const user = userEvent.setup()
    render(<PlayerAdjustments {...defaultProps} fontSize={56} />)

    const fontSizeControls = screen.getByText('Font Size').closest('[data-testid="settings-row"]')
    const incrementButton = fontSizeControls?.querySelector(':scope > div:last-child')?.querySelectorAll('button')[1]
    expect(incrementButton).toBeDisabled()
  })

  it('should transpose up', async () => {
    const user = userEvent.setup()
    const onTranspose = vi.fn()
    render(
      <PlayerAdjustments {...defaultProps} transpose={0} onTranspose={onTranspose} />
    )

    // Find the transpose stepper (row's last direct child — its first child
    // holds the label + save-as-default/for-song buttons)
    const transposeLabel = screen.getByText('Transpose')
    const transposeRow = transposeLabel.closest('[data-testid="settings-row"]')
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
      <PlayerAdjustments {...defaultProps} transpose={0} onTranspose={onTranspose} />
    )

    const transposeControls = screen.getByText('Transpose').closest('[data-testid="settings-row"]')
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
      <PlayerAdjustments
        {...defaultProps}
        transpose={3}
        onResetTranspose={onResetTranspose}
      />
    )

    const transposeControls = screen.getByText('Transpose').closest('[data-testid="settings-row"]')
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
      <PlayerAdjustments {...defaultProps} transpose={3} transposeDisplay="D#" />
    )

    // The transpose target is displayed as a note name in a button
    expect(screen.getByText('D#')).toBeInTheDocument()

    rerender(<PlayerAdjustments {...defaultProps} transpose={-2} transposeDisplay="Bb" />)
    expect(screen.getByText('Bb')).toBeInTheDocument()
  })

  it('should toggle the enharmonic spelling when the sharp/flat button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleTransposeSpelling = vi.fn()
    render(
      <PlayerAdjustments
        {...defaultProps}
        transpose={3}
        transposeDisplay="D#"
        isTransposeSpellingFlexible
        onToggleTransposeSpelling={onToggleTransposeSpelling}
      />
    )

    const transposeRow = screen.getByText('Transpose').closest('[data-testid="settings-row"]')
    const stepper = transposeRow?.querySelector(':scope > div:last-child')
    const spellingToggle = stepper?.querySelectorAll('button')[3]
    expect(spellingToggle).toBeTruthy()

    await user.click(spellingToggle!)
    expect(onToggleTransposeSpelling).toHaveBeenCalledTimes(1)
  })

  it('should disable the sharp/flat toggle when the target note has no alternative spelling', async () => {
    const user = userEvent.setup()
    render(
      <PlayerAdjustments
        {...defaultProps}
        transpose={0}
        transposeDisplay="C"
        isTransposeSpellingFlexible={false}
      />
    )

    const transposeRow = screen.getByText('Transpose').closest('[data-testid="settings-row"]')
    const stepper = transposeRow?.querySelector(':scope > div:last-child')
    const spellingToggle = stepper?.querySelectorAll('button')[3]
    expect(spellingToggle).toBeDisabled()
  })
})
