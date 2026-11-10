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

const { registerServiceWorker, applyServiceWorkerUpdate, SW_APPLY_TIMEOUT_MS } = await import('../registerServiceWorker')

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

  it('avisa cuando hay versión esperando y no la activa hasta aceptar', () => {
    const onNeedRefresh = vi.fn()
    registerServiceWorker({ onNeedRefresh }, { enabled: true })

    listeners.waiting.forEach((cb) => cb())
    expect(onNeedRefresh).toHaveBeenCalledTimes(1)
    expect(onNeedRefresh.mock.calls[0][0]).toBe(applyServiceWorkerUpdate)
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

describe('applyServiceWorkerUpdate — «Actualizar» siempre recarga', () => {
  const reload = vi.fn()
  let swListeners: Record<string, () => void>
  const stubServiceWorker = (waiting: { postMessage: ReturnType<typeof vi.fn> } | null) => {
    swListeners = {}
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: (type: string, cb: () => void) => {
          swListeners[type] = cb
        },
        getRegistration: vi.fn(() => Promise.resolve(waiting ? { waiting } : { waiting: null })),
      },
    })
  }

  beforeEach(() => {
    reload.mockClear()
    vi.useFakeTimers()
    vi.stubGlobal('location', { ...window.location, reload })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    // @ts-expect-error limpieza del stub de jsdom
    delete navigator.serviceWorker
  })

  it('pide al SW que espera que se active y recarga cuando toma el control', async () => {
    const waiting = { postMessage: vi.fn() }
    stubServiceWorker(waiting)
    await applyServiceWorkerUpdate()
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).not.toHaveBeenCalled()

    swListeners.controllerchange()
    expect(reload).toHaveBeenCalledTimes(1)
    // El temporizador de respaldo no recarga otra vez.
    vi.advanceTimersByTime(SW_APPLY_TIMEOUT_MS)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('si el SW no avisa de que tomó el control, recarga igual al vencer el plazo', async () => {
    stubServiceWorker({ postMessage: vi.fn() })
    await applyServiceWorkerUpdate()
    vi.advanceTimersByTime(SW_APPLY_TIMEOUT_MS - 1)
    expect(reload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('si ya no hay ninguno esperando (lo activó otra pestaña), recarga directamente', async () => {
    stubServiceWorker(null)
    await applyServiceWorkerUpdate()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('si el registro falla, recarga en vez de quedarse sin hacer nada', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: vi.fn(), getRegistration: () => Promise.reject(new Error('nope')) },
    })
    await applyServiceWorkerUpdate()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
