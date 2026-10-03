import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { YouTubePlayAlong } from '../YouTubePlayAlong'
import { __resetYouTubeIframeApiLoader, YT_PLAYER_STATE, type YTPlayerOptions } from '~/lib/youtubeIframeApi'

interface FakePlayer {
  options: YTPlayerOptions
  state: number
  playVideo: ReturnType<typeof vi.fn>
  pauseVideo: ReturnType<typeof vi.fn>
  seekTo: ReturnType<typeof vi.fn>
  getCurrentTime: ReturnType<typeof vi.fn>
  getPlayerState: () => number
  destroy: ReturnType<typeof vi.fn>
}

let players: FakePlayer[] = []

function installFakeYT() {
  players = []
  window.YT = {
    Player: vi.fn(function (this: unknown, _el: HTMLElement | string, options: YTPlayerOptions) {
      const p: FakePlayer = {
        options,
        state: YT_PLAYER_STATE.CUED,
        playVideo: vi.fn(() => {
          p.state = YT_PLAYER_STATE.PLAYING
        }),
        pauseVideo: vi.fn(() => {
          p.state = YT_PLAYER_STATE.PAUSED
        }),
        seekTo: vi.fn(),
        getCurrentTime: vi.fn(() => 33.6),
        getPlayerState: () => p.state,
        destroy: vi.fn(),
      }
      players.push(p)
      return p
    }) as unknown as NonNullable<typeof window.YT>['Player'],
  }
}

const fire = (p: FakePlayer, name: 'onReady' | 'onStateChange' | 'onError', data = 0) =>
  act(() => {
    p.options.events?.[name]?.({ target: p as never, data })
  })

const baseProps = {
  videoId: 'dQw4w9WgXcQ',
  startSeconds: 12,
  isPlaying: false,
  onStartSecondsChange: vi.fn(),
  onVideoPausedByUser: vi.fn(),
}

async function renderReady(props: Partial<typeof baseProps> & { restartKey?: number } = {}) {
  const utils = render(<YouTubePlayAlong {...baseProps} {...props} />)
  await act(async () => {})
  const p = players[0]
  fire(p, 'onReady')
  return { ...utils, p }
}

describe('YouTubePlayAlong', () => {
  beforeEach(() => {
    __resetYouTubeIframeApiLoader()
    installFakeYT()
    vi.clearAllMocks()
  })
  afterEach(() => {
    delete window.YT
    vi.restoreAllMocks()
  })

  it('embeds on youtube-nocookie.com starting at the offset', async () => {
    const { p } = await renderReady()
    expect(p.options.host).toBe('https://www.youtube-nocookie.com')
    expect(p.options.videoId).toBe('dQw4w9WgXcQ')
    expect(p.options.playerVars?.start).toBe(12)
    expect(p.playVideo).not.toHaveBeenCalled()
  })

  it('follows the single play state: Play seeks to the offset and plays, Pause pauses, resume continues', async () => {
    const { p, rerender } = await renderReady()

    rerender(<YouTubePlayAlong {...baseProps} isPlaying />)
    expect(p.seekTo).toHaveBeenCalledWith(12, true)
    expect(p.playVideo).toHaveBeenCalledTimes(1)

    rerender(<YouTubePlayAlong {...baseProps} isPlaying={false} />)
    expect(p.pauseVideo).toHaveBeenCalledTimes(1)

    rerender(<YouTubePlayAlong {...baseProps} isPlaying />)
    expect(p.playVideo).toHaveBeenCalledTimes(2)
    expect(p.seekTo).toHaveBeenCalledTimes(1) // resume, no jump back
  })

  it('plays as soon as it is ready when GigSync is already playing (e.g. DAW Start)', async () => {
    const { p } = await renderReady({ isPlaying: true })
    expect(p.seekTo).toHaveBeenCalledWith(12, true)
    expect(p.playVideo).toHaveBeenCalled()
  })

  it('jumps back to the offset when the transport restarts from the top', async () => {
    const { p, rerender } = await renderReady({ isPlaying: true, restartKey: 0 })
    expect(p.seekTo).toHaveBeenCalledTimes(1)
    rerender(<YouTubePlayAlong {...baseProps} isPlaying restartKey={1} />)
    expect(p.seekTo).toHaveBeenCalledTimes(2)
    expect(p.seekTo).toHaveBeenLastCalledWith(12, true)
  })

  it('pauses GigSync when the user pauses from the video controls, but not on a blocked autoplay', async () => {
    const onVideoPausedByUser = vi.fn()
    const { p } = await renderReady({ isPlaying: true, onVideoPausedByUser })

    // Blocked autoplay: never reaches PLAYING.
    fire(p, 'onStateChange', YT_PLAYER_STATE.PAUSED)
    expect(onVideoPausedByUser).not.toHaveBeenCalled()

    fire(p, 'onStateChange', YT_PLAYER_STATE.PLAYING)
    fire(p, 'onStateChange', YT_PLAYER_STATE.PAUSED)
    expect(onVideoPausedByUser).toHaveBeenCalledTimes(1)
  })

  it('adjusts and reports the start offset', async () => {
    const onStartSecondsChange = vi.fn()
    await renderReady({ onStartSecondsChange })
    fireEvent.click(screen.getByLabelText('Inicio un segundo después'))
    expect(onStartSecondsChange).toHaveBeenLastCalledWith(13)
    fireEvent.click(screen.getByLabelText('Inicio un segundo antes'))
    expect(onStartSecondsChange).toHaveBeenLastCalledWith(11)
    fireEvent.click(screen.getByText('Usar actual'))
    expect(onStartSecondsChange).toHaveBeenLastCalledWith(33)
  })

  it('hides and shows the mini-player without unmounting the video', async () => {
    const { p } = await renderReady()
    fireEvent.click(screen.getByLabelText('Ocultar video'))
    expect(screen.getByLabelText('Mostrar video')).toBeInTheDocument()
    expect(p.destroy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Mostrar video'))
    expect(screen.queryByLabelText('Mostrar video')).not.toBeInTheDocument()
  })

  it.each([
    [150, 'no se puede reproducir embebido'],
    [101, 'no se puede reproducir embebido'],
    [100, 'fue eliminado'],
  ])('shows a notice and drops the video on YouTube error %i', async (code, text) => {
    const { p } = await renderReady()
    fire(p, 'onError', code)
    expect(screen.getByRole('status')).toHaveTextContent(text)
    expect(screen.getByRole('status')).toHaveTextContent('El player sigue funcionando sin video.')
    expect(p.destroy).toHaveBeenCalled()
    expect(document.querySelector('section[aria-label="Video de YouTube"]')).toHaveClass('hidden')
  })

  it('shows an offline notice without loading YouTube', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<YouTubePlayAlong {...baseProps} />)
    await act(async () => {})
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')
    expect(players).toHaveLength(0)
    fireEvent.click(screen.getByLabelText('Cerrar aviso del video'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('retries and embeds the video when the connection comes back', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<YouTubePlayAlong {...baseProps} />)
    await act(async () => {})
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')
    onLine.mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await act(async () => {})
    expect(players).toHaveLength(1)
    fire(players[0], 'onReady')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ocultar video')).toBeInTheDocument()
  })

  it('shows a notice when the IFrame API cannot load', async () => {
    delete window.YT
    render(<YouTubePlayAlong {...baseProps} />)
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="iframe_api"]')
    expect(script).not.toBeNull()
    await act(async () => {
      script?.onerror?.(new Event('error'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo cargar YouTube')
  })
})
