import { useEffect, useState } from 'react'
import { registerServiceWorker } from '~/lib/pwa/registerServiceWorker'

/**
 * Registra el service worker y, cuando hay un deploy nuevo instalado, muestra
 * un aviso para aplicarlo. Nunca recarga sola: en mitad de un show eso
 * cortaría el player. Si se ignora, la versión nueva entra al reabrir la app.
 */
export function PwaUpdatePrompt() {
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null)
  // Desde el clic hasta la recarga: que se vea que el botón hizo algo.
  const [isApplying, setIsApplying] = useState(false)

  useEffect(
    () =>
      registerServiceWorker({
        onNeedRefresh: (apply) => setApplyUpdate(() => apply),
      }),
    [],
  )

  if (!applyUpdate) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:max-w-sm z-40 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#232948] px-4 py-3 text-sm text-slate-900 dark:text-white shadow-lg"
    >
      <span className="flex-1">Hay una nueva versión de GigSync.</span>
      <button
        type="button"
        onClick={() => setApplyUpdate(null)}
        disabled={isApplying}
        className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
      >
        Más tarde
      </button>
      <button
        type="button"
        onClick={() => {
          setIsApplying(true)
          void applyUpdate()
        }}
        disabled={isApplying}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        {isApplying ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  )
}
