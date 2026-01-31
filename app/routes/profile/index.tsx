import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { cn } from '~/lib/utils'
import { useProfile } from '~/hooks/useProfile'
import { useStats } from '~/hooks/useStats'
import { ProfileHeader } from '~/components/profile/ProfileHeader'
import { ProfileStats } from '~/components/profile/ProfileStats'
import { ProfileForm } from '~/components/profile/ProfileForm'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { profile, isLoading: profileLoading, updateProfile } = useProfile()
  const { stats, isLoading: statsLoading } = useStats()
  const [isEditing, setIsEditing] = useState(false)

  const handleSaveProfile = useCallback(
    async (updates: Partial<typeof profile>) => {
      await updateProfile(updates as any)
      setIsEditing(false)
    },
    [updateProfile]
  )

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Profile
          </h1>
          <Link
            to="/profile/settings"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'text-primary hover:bg-primary/10',
              'transition-colors'
            )}
          >
            Settings
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {isEditing && profile ? (
          <div className="py-6 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Edit Profile
            </h2>
            <ProfileForm
              profile={profile}
              onSave={handleSaveProfile}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <>
            {/* Profile Header */}
            {profile && (
              <ProfileHeader
                profile={profile}
                onEditClick={() => setIsEditing(true)}
              />
            )}

            {/* Stats Section */}
            <section className="max-w-md mx-auto">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Your Stats
              </h3>
              <ProfileStats stats={stats} isLoading={statsLoading} />
            </section>

            {/* Quick Actions */}
            <section className="max-w-md mx-auto mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  to="/profile/settings"
                  className={cn(
                    'flex items-center gap-3 p-4',
                    'bg-white dark:bg-[#111218]',
                    'rounded-xl border border-slate-200 dark:border-[#3b3f54]',
                    'hover:bg-slate-50 dark:hover:bg-[#161a2a]',
                    'transition-colors'
                  )}
                >
                  <span className="text-xl">⚙️</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      App Settings
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Customize metronome, tuner, and more
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>

                <button
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4',
                    'bg-white dark:bg-[#111218]',
                    'rounded-xl border border-slate-200 dark:border-[#3b3f54]',
                    'hover:bg-slate-50 dark:hover:bg-[#161a2a]',
                    'transition-colors text-left'
                  )}
                >
                  <span className="text-xl">✏️</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      Edit Profile
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Update your name, instrument, and band
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#101322]/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-20">
        <div className="flex items-center justify-around px-6 py-3">
          <NavItem href="/" icon="📚" label="Library" />
          <NavItem href="/setlists" icon="🎵" label="Setlists" />
          <NavItem href="/metronome" icon="⏱️" label="Metronome" />
          <NavItem href="/tuner" icon="🎸" label="Tuner" />
          <NavItem href="/profile" icon="👤" label="Profile" active />
        </div>
      </nav>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: string
  label: string
  active?: boolean
}

function NavItem({ href, icon, label, active = false }: NavItemProps) {
  return (
    <a
      href={href}
      className={cn(
        'flex flex-col items-center gap-1',
        active ? 'text-primary' : 'text-slate-400 dark:text-[#9da1b9]'
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </a>
  )
}
