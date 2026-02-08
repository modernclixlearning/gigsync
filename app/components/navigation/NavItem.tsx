import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  active?: boolean
}

export function NavItem({ to, icon, label, active = false }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors',
        active
          ? 'text-primary'
          : 'text-slate-400 dark:text-[#9da1b9] hover:text-slate-600 dark:hover:text-slate-300'
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  )
}
