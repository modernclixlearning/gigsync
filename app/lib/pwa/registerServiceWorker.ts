import { Workbox } from 'workbox-window'

/** Cada cuánto se pregunta al servidor si hay un sw.js nuevo (app abierta mucho rato). */
export const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000

export interface ServiceWorkerHandlers {
  /**
   * Hay una versión nueva instalada esperando. `applyUpdate` la activa y
   * recarga la página; si nunca se llama, se activa sola al cerrar todas las
   * pestañas/ventanas de la app.
   */
  onNeedRefresh: (applyUpdate: () => void) => void
}

/**
 * Registra `/sw.js` (generado post-build por scripts/pwa/build-sw.mjs).
 * Devuelve una función de limpieza. No hace nada en dev ni sin soporte de SW.
 */
export function registerServiceWorker(
  { onNeedRefresh }: ServiceWorkerHandlers,
  { enabled = import.meta.env.PROD }: { enabled?: boolean } = {},
): () => void {
  if (!enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {}
  }

  const wb = new Workbox('/sw.js', { scope: '/' })

  // También se dispara si ya había un SW esperando de una visita anterior.
  wb.addEventListener('waiting', () => {
    onNeedRefresh(() => {
      wb.addEventListener('controlling', () => window.location.reload())
      wb.messageSkipWaiting()
    })
  })

  const checkForUpdate = () => {
    wb.update().catch(() => {
      // Sin red: se reintenta en el próximo intervalo / foco.
    })
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  }

  let intervalId: ReturnType<typeof setInterval> | undefined
  wb.register()
    .then(() => {
      intervalId = setInterval(checkForUpdate, SW_UPDATE_INTERVAL_MS)
      document.addEventListener('visibilitychange', onVisibilityChange)
    })
    .catch((error: unknown) => {
      console.warn('[pwa] No se pudo registrar el service worker', error)
    })

  return () => {
    if (intervalId) clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
