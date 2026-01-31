import { cn } from '~/lib/utils'
import type { UserProfile } from '~/types/profile'

export interface ProfileHeaderProps {
  profile: UserProfile
  onEditClick?: () => void
}

export function ProfileHeader({ profile, onEditClick }: ProfileHeaderProps) {
  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="flex flex-col items-center py-8">
      {/* Avatar */}
      <div className="relative mb-4">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name || 'Profile'}
            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
          />
        ) : (
          <div
            className={cn(
              'w-24 h-24 rounded-full',
              'flex items-center justify-center',
              'bg-gradient-to-br from-primary to-primary/70',
              'text-white text-2xl font-bold',
              'border-4 border-white dark:border-slate-800 shadow-lg'
            )}
          >
            {initials}
          </div>
        )}
        {onEditClick && (
          <button
            onClick={onEditClick}
            className={cn(
              'absolute bottom-0 right-0',
              'w-8 h-8 rounded-full',
              'bg-white dark:bg-slate-700',
              'border-2 border-slate-200 dark:border-slate-600',
              'flex items-center justify-center',
              'text-slate-600 dark:text-slate-300',
              'shadow-md hover:shadow-lg',
              'transition-shadow'
            )}
            aria-label="Edit profile"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Name */}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
        {profile.name || 'Your Name'}
      </h2>

      {/* Instrument & Band */}
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span>{profile.instrument}</span>
        {profile.band && (
          <>
            <span>•</span>
            <span>{profile.band}</span>
          </>
        )}
      </div>
    </div>
  )
}
