import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useSetlists } from '~/hooks/useSetlists'
import { SetlistCard } from '~/components/setlists/SetlistCard'
import { SetlistForm } from '~/components/setlists/SetlistForm'
import type { CreateSetlistInput } from '~/types'

export const Route = createFileRoute('/setlists/')({
  component: SetlistsPage,
})

function SetlistsPage() {
  const { setlists, isLoading, createSetlist } = useSetlists()
  const [showForm, setShowForm] = useState(false)

  const handleCreateSetlist = async (data: CreateSetlistInput) => {
    await createSetlist(data)
    setShowForm(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101322]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-slate-50/80 dark:bg-[#101322]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Setlists
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20"
          >
            + New Setlist
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 pb-24">
        {setlists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              No setlists yet. Create your first one!
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {setlists.map((setlist) => (
              <Link key={setlist.id} to="/setlists/$setlistId" params={{ setlistId: setlist.id }}>
                <SetlistCard setlist={setlist} />
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Form Modal */}
      {showForm && (
        <SetlistForm
          onSubmit={handleCreateSetlist}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
