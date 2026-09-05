<!-- FORMATO: sin hard-wrap manual, una línea física por párrafo/bullet. Normalizado con tools/reflow-md.py. No reintroducir saltos de línea manuales al editar. -->

Retomamos GigSync: app companion para músicos en vivo (repertorio ChordPro, reproductor con Smart Autoscroll, metrónomo, afinador, setlists), proyecto personal single-usuario del owner, offline-first con IndexedDB local.

## Ubicaciones

- Repo de código: `C:\apps\second-brain\01_PROJECTS\gigsync\code` — https://github.com/modernclixlearning/gigsync
- Deploy de producción: https://playgigsync.vercel.app (proyecto Vercel `gig-sync`, auto-deploy en cada push a `master` vía integración GitHub)
- Contexto del proyecto en la bóveda: `C:\apps\second-brain\01_PROJECTS\gigsync\ai-context\project-context.md`
- Reglas del repo de código: `C:\apps\second-brain\01_PROJECTS\gigsync\code\CLAUDE.md`
- Sistema de diseño (nuevo, esta sesión): `C:\apps\second-brain\01_PROJECTS\gigsync\code\DESIGN.md`

## Restricciones

- Proyecto personal, single-PC, sin backend — todo el estado vive en IndexedDB (Dexie) del navegador. No proponer sync multi-dispositivo salvo pedido explícito del owner.
- Branching: `master` único, ramas `claude/<slug>` efímeras + PR, nunca commitear directo a `master`.
- Mergear un PR requiere que el usuario lo pida explícitamente en el chat cada vez — aprobar un PR no aprueba el siguiente, aunque el patrón se repita.
- Trabajo pesado de implementación se delega con `mcp__second-brain__sb_delegate` (`cli: copilot`, `mode: autopilot`, `role: writer`) — Claude coordina e integra, no escribe toda la implementación él mismo cuando el usuario pide delegar.

## Estado actual

Verificado (tests + tsc + deploy real):

- Producción viva en https://playgigsync.vercel.app (HTTP 200 confirmado). El dominio `gig-sync-zeta.vercel.app` fue eliminado del proyecto; `gigsync.vercel.app` (sin guión) no se pudo usar porque pertenece a otro equipo de Vercel.
- `master` tiene mergeados, en orden: PR #10 (import/export con merge no destructivo a 3 niveles), #11 (toast de éxito post-import), #12 (fix del control de Márgenes que estaba invertido), #13 (fix de transpose: transponía el doble de lo pedido + nueva ortografía enarmónica con toggle ♯/♭), #14 (más contraste, líneas inactivas más opacas), #15 (fix de contraste: la compañera de fila en un bloque fusionado quedaba tan brillante como la línea activa).
- Rama `claude/player-settings-v2-foundation` (pusheada a origin, 2 commits, TODAVÍA NO mergeada a `master`):
  - `46045aa` (mío): sistema de diseño — `DESIGN.md` + primitivos compartidos nuevos en `app/components/profile/SettingsSection.tsx` (`SettingsStepper`, `SettingsColorField`, `SaveTierButtons`) reutilizando el `SettingsRow`/`SettingsToggle`/`SettingsSelect` que ya existían y ya usaba la Settings page principal. Tipos y estado del hook (`useSongPlayer` en `app/hooks/useSongs.ts`) para `chordFontSize`, `beatHighlightMode`/`beatHighlightTextColor`/`beatHighlightBgColor`, `backgroundColor`/`lyricsTextColor`. Panel de settings del player (`PlayerControls.tsx`) reconstruido con esos primitivos: las 5 filas viejas (Scroll Speed, Font Size, Versos por línea, Márgenes, Transpose) más 3 filas nuevas. El panel ahora tiene `max-w-2xl mx-auto` y cada fila es responsive (`SettingsRow` apila label/control en pantallas angostas) — arregla el vacío enorme entre label y control que había quedado tras decouplear el panel del ancho de lectura (`contentWidth`).
  - `964fba5` (delegado a un copilot vía `sb_delegate`, taskId `d33b8dcd`, terminó con exit 0): cascada de resolución a 3 niveles (canción → setlist → librería → fallback hardcodeado) para las 11 settings del player, no solo las 3 nuevas. Implementó `handleSaveControlForSetlist` de verdad vía `useSetlist().updateSetlist` (antes era un stub con `console.warn`). Aplicó `chordFontSize` al render real de las etiquetas de acorde flotantes (`ChordOverlay.tsx`, `LyricVerseLine.tsx`, `LyricBarGrid.tsx`), reemplazando las clases Tailwind `text-[0.4em]`/`text-[0.6em]` fijas por un `style={{ fontSize: chordFontSize }}`. Aplicó `beatHighlightMode`/colores al bloque `<style>` que resalta la palabra que suena (antes hardcodeado a sky-400), con dos ramas: `text` (tiñe el texto) y `background` (caja de fondo). Aplicó `backgroundColor`/`lyricsTextColor` como estilos inline aditivos (solo cuando no son `null`) sin tocar el theming claro/oscuro existente.
  - `npx tsc --noEmit` limpio y `npx vitest run` en 245/245 en ambos commits — confirmado corriendo los comandos yo mismo, no solo por el reporte del copilot.
  - Revisé el diff de `964fba5` línea por línea: calidad buena, hace exactamente lo pedido, no tocó nada fuera de scope (dejó `InstrumentalSection.tsx` intacto como se le pidió). Un detalle menor NO bloqueante: en modo `text` el glow del beat-highlight ahora queda opaco (usa `beatHighlightTextColor` sólido también para el `text-shadow`) en vez de la traslucidez `rgba(56,189,248,0.55)` que tenía el hardcode original. Si se quiere el look exacto de antes, convertir el color a rgba con alpha al construir el `text-shadow` en `SongPlayerContent.tsx`.

NO verificado todavía — esto es lo importante para la próxima sesión:

- Nada de la rama `claude/player-settings-v2-foundation` se probó en un browser real después del commit del copilot. El panel con las 5 filas viejas sí se vio en pantalla (screenshot tomado antes de delegar), pero las 3 filas nuevas y su efecto real sobre el render (tamaño de acorde doble por defecto, el toggle Letra/Fondo cambiando el highlight durante playback, los color pickers de fondo/letra cambiando el look real) nunca se vieron — el copilot solo corrió `tsc`/`vitest`, no abrió un browser.

## Pendientes (en orden)

1. Levantar `npm run dev` en `C:\apps\second-brain\01_PROJECTS\gigsync\code` y verificar visualmente en el browser (Chrome vía `claude-in-chrome`) el panel de settings completo: que las 3 filas nuevas se vean bien, que el tamaño de acorde por defecto se vea el doble que antes del cambio, que tocar el toggle Letra/Fondo cambie de verdad el efecto visual durante la reproducción, que los color pickers de fondo y de letra cambien el look real del reproductor, y que los 2-3 botones de guardado (Canción / Setlist / Librería) persistan correctamente — el de Setlist solo debería aparecer cuando el player se abre desde un setlist (`canSaveForSetlist`).
2. Si algo no anda como se espera, arreglarlo en la misma rama.
3. Commitear cualquier fix que haya salido de la verificación visual.
4. Abrir PR de `claude/player-settings-v2-foundation` → `master` con `gh pr create` (mismo patrón que los PRs #10-#15 de esta sesión: título corto, resumen en bullets, test plan con checkboxes).
5. Esperar a que el usuario pida el merge explícitamente en el chat — no asumir aprobación de PRs anteriores.
6. Después de mergear, confirmar el deploy automático: `vercel ls gig-sync` hasta ver `Ready`, después `curl -I https://playgigsync.vercel.app`.
7. Opcional / bajo impacto: `01_PROJECTS/gigsync/ai-context/project-context.md` todavía dice "sin deploy productivo confirmado aún", ya no es cierto. Ese archivo tiene su propia regla de no editarlo directo sin proponerle el cambio al usuario antes — proponer el diff, no editarlo de una.

## Decisiones tomadas (no re-litigar)

- Ortografía enarmónica del transpose: por defecto se elige la que tenga menos alteraciones en la armadura de clave destino (ej. transponer G +3 semitonos da Bb, no A#) — hay un toggle manual ♯/♭ solo para los 5 pares genuinamente ambiguos (C#/Db, D#/Eb, F#/Gb, G#/Ab, A#/Bb). Ver `defaultPrefersFlats` en `app/lib/chordpro/transpose.ts`.
- El import de canciones ya no borra la librería local: hace merge no destructivo con resolución de conflictos por canción (mantener la mía / usar la importada) solo cuando el contenido realmente difiere — pedido explícito del usuario.
- Se agregó una 3ra opción de guardado ("para este setlist") a TODOS los player settings, no solo a los nuevos — mismo componente `SaveTierButtons` para consistencia. Pedido explícito: "hay que añadir esta 3er opción de guardado para todos los settings".
- El "sistema de diseño" pedido se resolvió extendiendo `SettingsSection.tsx` (que ya existía y ya usaba la Settings page principal) en vez de crear un kit nuevo desde cero — la app ya tenía tokens de color en `globals.css`, solo faltaba que el panel del player los usara en vez de tener su propio markup ad-hoc duplicado. Documentado en `DESIGN.md`.
- El usuario pidió explícitamente delegar el trabajo de implementación pesado a copilots vía `sb_delegate` en modo autopilot, coordinando Claude la integración — patrón a repetir en features grandes futuras de este proyecto. Importante: declarar `mcp: ["second-brain"]` en la delegación, o la hija no puede reportar ni despertar la sesión al terminar (el primer intento con `mcp: []` falló silenciosamente en ese aspecto).
- Dominio `gigsync.vercel.app` (sin guión) no se pudo reclamar — pertenece a otro equipo de Vercel. Se usa `playgigsync.vercel.app`.

## Gotchas / dónde está lo demás

- `CLAUDE.md` del repo de código tiene las reglas de branching, CI y archivos "Do Not Touch" (`.env`, `.github/workflows/ci.yml`) — leerlo antes de tocarlos.
- `DESIGN.md` (nuevo, raíz del repo de código) documenta los tokens de color/radio y los primitivos compartidos de settings — cualquier setting nueva del player debe reusar `SettingsRow` + `SettingsStepper`/`SettingsColorField`/`SaveTierButtons` de `app/components/profile/SettingsSection.tsx`, no inventar markup nuevo.
- El bug de "doble transposición" (el player transponía el doble de los semitonos pedidos cuando `linesPerBlock > 1`, que es el default) estaba repetido en 3 lugares que re-transponían acordes que ya venían transpuestos desde `parseChordPro` (`splitLineIntoSegments` en el parser, `splitIntoBarSegments` en `LyricBarGrid.tsx`, `baseChords` en `InstrumentalSection.tsx`). Si aparece un bug parecido de "se aplicó el doble" en el futuro, sospechar del mismo patrón: un dato ya derivado siendo re-derivado más abajo en la cadena de render.

## Forma de trabajo

- Español para toda comunicación con el usuario.
- Todo PR sigue el mismo patrón: rama `claude/<slug>` desde `master` → commit descriptivo con atribución (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, verificar si el system reminder de la sesión pide además un link de Claude-Session, cambió más de una vez en esta sesión) → push → `gh pr create` con resumen + test plan → esperar CI verde (`gh pr checks <N>`) → esperar el "mergeá" explícito del usuario, nunca asumirlo.
- Verificar siempre `npx tsc --noEmit` + `npx vitest run` antes de dar algo por terminado, y cuando el cambio es visual, verificar además en un browser real (Chrome vía `claude-in-chrome`) antes de decir que el fix funciona — el diagnóstico "a ojo" del código estuvo equivocado más de una vez hasta ver el resultado real en pantalla (el bug de doble-transposición y el ajuste de 2 vs 3 niveles de opacidad en el highlight de línea activa se descubrieron así).
- El usuario a veces escribe en mayúsculas para dar énfasis en una corrección importante — no es enojo.

Empezá por: verificar visualmente en el browser el panel de settings del player en la rama `claude/player-settings-v2-foundation` (paso 1 de Pendientes) — levantar `npm run dev` en `C:\apps\second-brain\01_PROJECTS\gigsync\code` y abrir una canción para probar el tamaño de acordes, el resaltado de beat y los colores nuevos antes de abrir el PR.
