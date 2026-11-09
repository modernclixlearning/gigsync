/**
 * The frame every main screen shares: navigation + page header + content
 * column. Screens differ in what they show, not in where the title sits,
 * how wide the content runs or where the navigation lives.
 *
 * Navigation by screen size (see DESIGN.md → Layout):
 *  - phone (< md): bottom bar
 *  - tablet (md): icon rail on the left
 *  - desktop (lg+): sidebar with labels
 */

import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft, ListMusic, Music2, Mic, Timer, User, AlertTriangle, X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { ROUTES } from '~/lib/routes'

const NAV_ITEMS = [
  { to: ROUTES.HOME, icon: Music2, label: 'Canciones' },
  { to: ROUTES.SETLISTS, icon: ListMusic, label: 'Setlists' },
  { to: ROUTES.METRONOME, icon: Timer, label: 'Metrónomo' },
  { to: ROUTES.TUNER, icon: Mic, label: 'Afinador' },
  { to: ROUTES.PROFILE, icon: User, label: 'Perfil' },
] as const

/** Content column widths: lists breathe wider than forms and single-purpose tools. */
const WIDTHS = {
  narrow: 'max-w-2xl',
  wide: 'max-w-5xl',
} as const

export type PageWidth = keyof typeof WIDTHS

export function AppNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav
      aria-label="Principal"
      className={cn(
        'fixed z-30 bg-white/90 dark:bg-[#101322]/90 backdrop-blur-xl border-slate-200 dark:border-slate-800',
        // Phone: bottom bar
        'inset-x-0 bottom-0 border-t safe-area-pb',
        // Tablet: rail · Desktop: sidebar
        'md:inset-y-0 md:right-auto md:w-20 md:border-t-0 md:border-r md:pb-0 lg:w-60'
      )}
    >
      <div className="hidden md:flex items-center justify-center lg:justify-start gap-2.5 h-16 lg:px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <Music2 className="h-5 w-5" />
        </span>
        <span className="hidden lg:inline text-lg font-bold text-slate-900 dark:text-white">GigSync</span>
      </div>

      <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1 md:px-2 lg:px-3 md:pt-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? pathname === '/' || pathname.startsWith('/song') : pathname.startsWith(to)
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-h-14 px-1 py-2 transition-colors',
                  'md:rounded-xl md:min-h-16 lg:flex-row lg:justify-start lg:gap-3 lg:min-h-11 lg:px-3',
                  active
                    ? 'text-primary dark:text-indigo-400 md:bg-indigo-50 md:dark:bg-indigo-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white md:hover:bg-slate-100 md:dark:hover:bg-slate-800/60'
                )}
              >
                <Icon className="h-6 w-6 lg:h-5 lg:w-5 shrink-0" />
                <span className="text-[11px] font-semibold leading-none lg:text-sm">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

interface PageProps {
  title: string
  /** Shown under the title on tablet/desktop, where there is room for it. */
  subtitle?: string
  /** Route to go back to — renders the back arrow next to the title. */
  backTo?: string
  /** Buttons on the right of the header. */
  actions?: ReactNode
  width?: PageWidth
  /** Hide the app navigation (detail screens that are a step inside a section keep it; full-screen tools don't). */
  hideNav?: boolean
  children: ReactNode
}

export function Page({ title, subtitle, backTo, actions, width = 'wide', hideNav = false, children }: PageProps) {
  return (
    <div className={cn('min-h-dvh bg-slate-50 dark:bg-[#101322]', !hideNav && 'md:pl-20 lg:pl-60')}>
      <header className="sticky top-0 z-20 bg-slate-50/85 dark:bg-[#101322]/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className={cn('mx-auto flex h-16 items-center justify-between gap-3 px-4 md:px-8', WIDTHS[width])}>
          <div className="flex min-w-0 items-center gap-1">
            {backTo && (
              <Link to={backTo} aria-label="Volver" className={cn(iconButtonClass(), '-ml-2')}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
              {subtitle && (
                <p className="hidden md:block truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1 sm:gap-2">{actions}</div>}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full px-4 md:px-8 py-4 md:py-6',
          // Clear the bottom bar on phones
          hideNav ? 'pb-10' : 'pb-28 md:pb-10',
          WIDTHS[width]
        )}
      >
        {children}
      </main>

      {!hideNav && <AppNav />}
    </div>
  )
}

/** Full-screen spinner while a page's data loads. */
export function PageLoading() {
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-[#101322] flex items-center justify-center md:pl-20 lg:pl-60">
      <div role="status" aria-label="Cargando" className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      <AppNav />
    </div>
  )
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark shadow-sm',
  secondary:
    'bg-slate-200/70 dark:bg-[#232948] text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-[#2d3454]',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

/** Text button (optionally with a leading icon). 44px tall: comfortable to tap. */
export function buttonClass(variant: ButtonVariant = 'primary', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold whitespace-nowrap',
    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    BUTTON_VARIANTS[variant],
    className
  )
}

/** Square icon-only button, same 44px target as `buttonClass`. Always pair with an aria-label. */
export function iconButtonClass(className?: string) {
  return cn(
    'inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-xl transition-colors',
    'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800',
    className
  )
}

/** The standard card surface. */
export const cardClass =
  'rounded-2xl bg-white dark:bg-[#161a2e] border border-slate-200 dark:border-slate-800'

/** Small uppercase heading over a group of content. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400', className)}>
      {children}
    </h2>
  )
}

/* ── States ──────────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-primary dark:text-indigo-400">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface ErrorBannerProps {
  title?: string
  message: string
  onDismiss?: () => void
  /** Extra action on the right (e.g. "Reintentar"). */
  action?: ReactNode
}

export function ErrorBanner({ title = 'Algo salió mal', message, onDismiss, action }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">{title}</p>
        <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">{message}</p>
      </div>
      {action}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Cerrar aviso" className="text-red-600 dark:text-red-400 p-1">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
