/**
 * Constantes de rutas centralizadas
 * Usar estas constantes en lugar de strings hardcodeados para mantener consistencia
 */

// Rutas principales
export const ROUTES = {
  HOME: '/',
  SETLISTS: '/setlists',
  METRONOME: '/metronome',
  TUNER: '/tuner',
  PROFILE: '/profile',
  PROFILE_SETTINGS: '/profile/settings',
} as const

// Funciones helper para rutas con parámetros
// Estas funciones devuelven objetos compatibles con TanStack Router Link/navigate
export const routeHelpers = {
  /**
   * Ruta para ver una canción
   */
  song: (songId: string) => ({
    to: '/song/$songId' as const,
    params: { songId },
  }),

  /**
   * Ruta para editar una canción
   */
  songEdit: (songId: string) => ({
    to: '/song/$songId/edit' as const,
    params: { songId },
  }),

  /**
   * Ruta para ver un setlist
   */
  setlist: (setlistId: string) => ({
    to: '/setlists/$setlistId' as const,
    params: { setlistId },
  }),

  /**
   * Ruta para modo play de un setlist
   */
  setlistPlay: (setlistId: string) => ({
    to: '/setlists/$setlistId/play' as const,
    params: { setlistId },
  }),
} as const

// Tipos para autocompletado
export type RoutePath = typeof ROUTES[keyof typeof ROUTES]
