import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Music2 } from 'lucide-react'
import { useSong } from '~/hooks/useSongs'
import { SongPlayerContent } from '~/components/player/SongPlayerContent'
import { ROUTES } from '~/lib/routes'

export const Route = createFileRoute('/song/$songId/')({
  component: SongPlayerPage
})

function SongPlayerPage() {
  const { songId } = Route.useParams()
  const navigate = useNavigate()
  const { song, isLoading } = useSong(songId)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101322] flex flex-col items-center justify-center">
        <Music2 className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Song not found
        </h2>
        <Link
          to={ROUTES.HOME}
          className="text-indigo-500 hover:text-indigo-600"
        >
          Back to library
        </Link>
      </div>
    )
  }

  return (
    <SongPlayerContent
      song={song}
      onBack={() => navigate({ to: ROUTES.HOME })}
    />
  )
}
