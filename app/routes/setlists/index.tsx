import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ListMusic, Plus, Upload } from 'lucide-react'
import { useSetlists } from '~/hooks/useSetlists'
import { SetlistCard } from '~/components/setlists/SetlistCard'
import { SetlistForm } from '~/components/setlists/SetlistForm'
import { Page, PageLoading, EmptyState, ErrorBanner, buttonClass, iconButtonClass } from '~/components/layout'
import { useGigsyncImport } from '~/components/share/useGigsyncImport'
import { routeHelpers } from '~/lib/routes'
import type { CreateSetlistInput } from '~/types'

export const Route = createFileRoute('/setlists/')({
  component: SetlistsPage,
})

function SetlistsPage() {
  const { setlists, isLoading, createSetlist } = useSetlists()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { openPicker, node: importNode } = useGigsyncImport()

  const handleCreateSetlist = async (data: CreateSetlistInput) => {
    try {
      setError(null)
      await createSetlist(data)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el setlist')
    }
  }

  if (isLoading) return <PageLoading />

  const newSetlistButton = (
    <button type="button" onClick={() => setShowForm(true)} className={buttonClass('primary')}>
      <Plus className="w-4 h-4" />
      <span>
        Nuevo<span className="hidden sm:inline"> setlist</span>
      </span>
    </button>
  )

  return (
    <Page
      title="Setlists"
      subtitle={`${setlists.length} ${setlists.length === 1 ? 'lista' : 'listas'} para tus conciertos`}
      actions={
        <>
          <button
            type="button"
            onClick={openPicker}
            title="Importar un fichero .gigsync"
            aria-label="Importar"
            className={iconButtonClass()}
          >
            <Upload className="w-5 h-5" />
          </button>
          {newSetlistButton}
        </>
      }
    >
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {setlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic className="w-8 h-8" />}
          title="Aún no tienes setlists"
          description="Agrupa canciones en el orden del concierto y tócalas una tras otra."
          action={newSetlistButton}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {setlists.map((setlist) => (
            <Link key={setlist.id} {...routeHelpers.setlist(setlist.id)} className="block rounded-2xl">
              <SetlistCard setlist={setlist} />
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <SetlistForm
          onSubmit={handleCreateSetlist}
          onCancel={() => setShowForm(false)}
        />
      )}

      {importNode}
    </Page>
  )
}
