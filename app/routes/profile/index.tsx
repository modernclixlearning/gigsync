import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { ChevronRight, Pencil, Settings } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useProfile } from '~/hooks/useProfile'
import { useStats } from '~/hooks/useStats'
import { ProfileHeader } from '~/components/profile/ProfileHeader'
import { ProfileStats } from '~/components/profile/ProfileStats'
import { ProfileForm } from '~/components/profile/ProfileForm'
import { Page, PageLoading, SectionTitle, cardClass, iconButtonClass } from '~/components/layout'
import { ROUTES } from '~/lib/routes'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
})

const actionRowClass = cn(
  cardClass,
  'w-full flex items-center gap-3 p-4 text-left transition-colors',
  'hover:border-indigo-300 dark:hover:border-indigo-500/50'
)

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

  if (profileLoading) return <PageLoading />

  return (
    <Page
      title={isEditing ? 'Editar perfil' : 'Perfil'}
      width="narrow"
      actions={
        !isEditing && (
          <Link to={ROUTES.PROFILE_SETTINGS} aria-label="Ajustes" title="Ajustes" className={iconButtonClass()}>
            <Settings className="w-5 h-5" />
          </Link>
        )
      }
    >
      {isEditing && profile ? (
        <ProfileForm
          profile={profile}
          onSave={handleSaveProfile}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          {profile && (
            <ProfileHeader
              profile={profile}
              onEditClick={() => setIsEditing(true)}
            />
          )}

          <section>
            <SectionTitle className="mb-3 px-1">Tu actividad</SectionTitle>
            <ProfileStats stats={stats} isLoading={statsLoading} />
          </section>

          <section className="mt-8">
            <SectionTitle className="mb-3 px-1">Accesos</SectionTitle>
            <div className="space-y-2">
              <Link to={ROUTES.PROFILE_SETTINGS} className={actionRowClass}>
                <Settings className="w-5 h-5 shrink-0 text-primary dark:text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">Ajustes de la app</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Apariencia, metrónomo, afinador, reproductor y datos
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
              </Link>

              <button type="button" onClick={() => setIsEditing(true)} className={actionRowClass}>
                <Pencil className="w-5 h-5 shrink-0 text-primary dark:text-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">Editar perfil</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tu nombre, instrumento y banda
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
              </button>
            </div>
          </section>
        </>
      )}
    </Page>
  )
}
