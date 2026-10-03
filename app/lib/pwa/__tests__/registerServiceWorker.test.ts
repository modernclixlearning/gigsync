import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const listeners: Record<string, Array<() => void>> = {}
const wbMock = {
  addEventListener: vi.fn((type: string, cb: () => void) => {
    ;(listeners[type] ??= []).push(cb)
  }),
  register: vi.fn(() => Promise.resolve(undefined)),
  update: vi.fn(() => Promise.resolve()),
  messageSkipWaiting: vi.fn(),
}
const WorkboxCtor = vi.fn(() => wbMock)

vi.mock('workbox-window', () => ({ Workbox: WorkboxCtor }))

const { registerServiceWorker } = await import('../registerServiceWorker')

describe('registerServiceWorker (#39)', () => {
  beforeEach(() => {
    for (const key of Object.keys(listeners)) delete listeners[key]
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
  })
  afterEach(() => {
    // @ts-expect-error limpieza del stub de jsdom
    delete navigator.serviceWorker
  })

  it('no registra nada si está deshabilitado (dev)', () => {
    registerServiceWorker({ onNeedRefresh: vi.fn() }, { enabled: false })
    expect(WorkboxCtor).not.toHaveBeenCalled()
  })

  it('registra /sw.js con scope raíz', async () => {
    registerServiceWorker({ onNeedRefresh: vi.fn() }, { enabled: true })
    expect(WorkboxCtor).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    await Promise.resolve()
    expect(wbMock.register).toHaveBeenCalledTimes(1)
  })

  it('avisa cuando hay versión esperando y la activa sólo al aceptar', () => {
    const onNeedRefresh = vi.fn()
    registerServiceWorker({ onNeedRefresh }, { enabled: true })

    listeners.waiting.forEach((cb) => cb())
    expect(onNeedRefresh).toHaveBeenCalledTimes(1)
    expect(wbMock.messageSkipWaiting).not.toHaveBeenCalled()

    const applyUpdate = onNeedRefresh.mock.calls[0][0] as () => void
    applyUpdate()
    expect(wbMock.messageSkipWaiting).toHaveBeenCalledTimes(1)
    expect(listeners.controlling).toHaveLength(1)
  })

  it('busca actualizaciones al volver a la app', async () => {
    const cleanup = registerServiceWorker({ onNeedRefresh: vi.fn() }, { enabled: true })
    await Promise.resolve()
    await Promise.resolve()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(wbMock.update).toHaveBeenCalled()
    cleanup()
  })
})
