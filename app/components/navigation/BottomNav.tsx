import { useRouterState } from '@tanstack/react-router'
import { Music2, ListMusic, Timer, Music, User } from 'lucide-react'
import { NavItem } from './NavItem'
import { ROUTES } from '~/lib/routes'

const NAV_ITEMS = [
  {
    to: ROUTES.HOME,
    icon: Music2,
    label: 'Library',
    pathMatch: '/',
  },
  {
    to: ROUTES.SETLISTS,
    icon: ListMusic,
    label: 'Setlists',
    pathMatch: '/setlists',
  },
  {
    to: ROUTES.METRONOME,
    icon: Timer,
    label: 'Metronome',
    pathMatch: '/metronome',
  },
  {
    to: ROUTES.TUNER,
    icon: Music,
    label: 'Tuner',
    pathMatch: '/tuner',
  },
  {
    to: ROUTES.PROFILE,
    icon: User,
    label: 'Profile',
    pathMatch: '/profile',
  },
] as const

export function BottomNav() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#101322]/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-20 safe-area-pb">
      <div className="flex items-center justify-around px-6 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.pathMatch === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.pathMatch)

          return (
            <NavItem
              key={item.to}
              to={item.to}
              icon={<item.icon className="w-6 h-6" />}
              label={item.label}
              active={isActive}
            />
          )
        })}
      </div>
    </nav>
  )
}
