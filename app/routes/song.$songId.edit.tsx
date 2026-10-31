import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Editing happens in the player's side panel (Editar tab), next to the song:
 * this old address opens the player with that panel. `/song/new/edit` was the
 * old "add song" address.
 */
export const Route = createFileRoute('/song/$songId/edit')({
  beforeLoad: ({ params }) => {
    if (params.songId === 'new') throw redirect({ to: '/songs/new', replace: true })
    throw redirect({ to: '/song/$songId', params: { songId: params.songId }, search: { panel: 'edit' }, replace: true })
  },
})
