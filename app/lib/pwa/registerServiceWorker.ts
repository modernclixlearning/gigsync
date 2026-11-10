import { Workbox } from 'workbox-window'

/** Cada cuánto se pregunta al servidor si hay un sw.js nuevo (app abierta mucho rato). */
export const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000

/** Si el SW nuevo no toma el control en este tiempo tras aceptar, se recarga igual. */
export const SW_APPLY_TIMEOUT_MS = 4000

/**
 * Aplica la versión que está esperando y recarga la página. Siempre termina
 * en una recarga — «Actualizar» nunca puede quedarse sin hacer nada:
 *  - hay un SW esperando → se le pide activarse y se recarga cuando toma el
 *    control (o al vencer SW_APPLY_TIMEOUT_MS si no avisa);
 *  - ya no hay ninguno esperando (lo activó otra pestaña o ventana de la app,
 *    o el registro no está disponible) → la versión nueva ya está activa: basta
 *    con recargar.
 */
export async function applyServiceWorkerUpdate(): Promise<void> {
  let reloaded = false
  const reload = () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }

  let waiting: ServiceWorker | null | undefined
  try {
    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
    waiting = (await navigator.serviceWorker.getRegistration('/'))?.waiting
  } catch {
    waiting = null
  }

  if (!waiting) {
    reload()
    return
  }
  waiting.postMessage({ type: 'SKIP_WAITING' })
  setTimeout(reload, SW_APPLY_TIMEOUT_MS)
}

export interface ServiceWorkerHandlers {
  /**
   * Hay una versión nueva instalada esperando. `applyUpdate` la activa y
   * recarga la página (ver applyServiceWorkerUpdate); si nunca se llama, se
   * activa sola al cerrar todas las pestañas/ventanas de la app.
   */
  onNeedRefresh: (applyUpdate: () => Promise<void>) => void
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
    onNeedRefresh(applyServiceWorkerUpdate)
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
