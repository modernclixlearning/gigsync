import { Navigate, createFileRoute } from '@tanstack/react-router'

/**
 * Documento "shell" para uso offline (#39). El service worker lo precachea y
 * lo sirve para CUALQUIER navegación cuando no hay red: como `ssr: false`, el
 * servidor sólo renderiza el layout raíz (sin contenido de ninguna ruta) y en
 * el cliente el router monta la ruta real de la URL, leyendo de IndexedDB.
 *
 * Si alguien abre `/app-shell` a mano, lo mandamos a la biblioteca.
 */
export const Route = createFileRoute('/app-shell')({
  ssr: false,
  component: () => <Navigate to="/" replace />,
})
