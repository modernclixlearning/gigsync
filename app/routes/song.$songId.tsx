import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/song/$songId')({
  component: SongLayout
})

function SongLayout() {
  return <Outlet />
}

