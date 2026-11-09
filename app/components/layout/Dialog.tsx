import { useEffect, type ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface DialogProps {
  title: string
  onClose: () => void
  /** `md` for forms and confirmations, `lg` for pickers with a list inside. */
  size?: 'md' | 'lg'
  children: ReactNode
}

/**
 * The one modal surface: a bottom sheet on phones (reachable with the thumb),
 * a centered card from `sm:` up. Closes on Escape and on a tap outside.
 */
export function Dialog({ title, onClose, size = 'md', children }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex w-full max-h-[85dvh] flex-col p-5 sm:p-6 safe-area-pb',
          'rounded-t-2xl sm:rounded-2xl',
          'bg-white dark:bg-[#161a2e] border border-slate-200 dark:border-slate-800 shadow-2xl',
          size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-md'
        )}
      >
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/** Text input / select / date field used inside dialogs and forms. */
export const fieldClass = cn(
  'w-full h-11 px-4 rounded-xl border-none',
  'bg-slate-100 dark:bg-[#232948]',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-primary'
)

export const fieldLabelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'
