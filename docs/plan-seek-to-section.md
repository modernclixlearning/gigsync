# PLAN MAESTRO: Seek-to-Section & Song Navigation

**Fecha**: 20 de Febrero, 2026  
**Estado**: Aprobado — Fuente de verdad para implementación  
**Alcance**: Reproducción desde sección (click en acorde) + navegación Previous/Next entre canciones

---

## 1. Definición del Alcance

### 1.1 Objetivo

Permitir al músico:

1. **Seek-to-Section**: Al hacer click/tap en cualquier acorde o sección durante la reproducción (con metrónomo y chord slot display activos), la reproducción salta a la posición musical correspondiente y continúa desde ahí.
2. **Previous / Next Song**: Botones de navegación visibles en modo individual (no solo setlist) para saltar entre canciones de una setlist, o reiniciar la canción actual.

### 1.2 Fuera de Alcance

- Cambios en el parser de ChordPro
- Cambios en el cálculo de duración del timeline (`calculator.ts`)
- Modificaciones al formato de datos de `Song` o `Setlist`
- Nuevos sonidos de metrónomo o subdivisiones
- Seek por gesto de drag/scrub (futura V3)
- Seek en modo lyrics-only sin acordes (no hay mapping musical preciso)

---

## 2. Arquitectura Actual (Contexto)

### 2.1 Flujo de Reproducción

```
SongPlayerContent
  ├── useSongPlayer()          → state: isPlaying, showChords, metronomeSoundEnabled...
  ├── useSmartAutoScroll()     → orquesta timeline + BPM sync
  │     ├── useSongTimeline()  → crea SongTimeline con elements[].startBeat/endBeat
  │     └── useBPMSync()       → Tone.js Transport, currentBeat, seekToBeat()
  ├── useMetronomeSound()      → reacciona a currentBeatInBar/currentBar
  └── Render
        ├── ChordOverlay → LyricBarGrid / InstrumentalSection
        └── LyricsDisplay (sin acordes, fuera de alcance de seek)
```

### 2.2 Primitivas Existentes Clave

| Primitiva | Ubicación | Descripción |
|-----------|-----------|-------------|
| `seekToBeat(beat)` | `useBPMSync` | Mueve Tone.js Transport a un beat absoluto |
| `autoScroll.seekToBeat(beat)` | `useSmartAutoScroll` | Proxy a `bpmSync.seekToBeat` |
| `timeline.getElementAtBeat(beat)` | `useSongTimeline` | Busca elemento en posición de beat |
| `element.startBeat` / `element.endBeat` | `TimelineElement` | Beat de inicio/fin de cada elemento |
| `data-element-id` | DOM attributes | Identifica cada elemento del timeline en el DOM |
| `data-chord-index` | DOM attributes | Identifica cada celda de acorde dentro de un grid |
| `data-bar-element` | DOM attributes | Marca elementos tipo grid (bar-based) |

### 2.3 Componentes que Renderizan Acordes Clickeables

| Componente | Qué renderiza | Atributos DOM |
|------------|---------------|---------------|
| `LyricBarGrid` | Líneas de letra con acordes en grid de barras | `data-element-id`, `data-chord-index`, `data-bar-element` |
| `InstrumentalSection` | Secciones instrumentales (intro, solo, etc.) | `data-chord-index` (en cada celda) |
| `ChordOverlayLine` | Wrapper que elige qué componente usar | `data-element-id` en cada tipo |

---

## 3. Decisiones Técnicas

### 3.1 Estrategia de Seek

**Decisión**: Calcular el beat de destino a partir de `data-element-id` + `data-chord-index` del elemento clickeado.

**Fórmula**:
```
targetBeat = element.startBeat + (chordIndex * beatsPerBar)
```

- Si se clickea un `data-chord-index` específico dentro de un `data-element-id` → seek al beat exacto de esa celda.
- Si se clickea un elemento sin `data-chord-index` (sección header, línea sin acordes) → seek al `startBeat` del elemento.

**Justificación**: Los `data-*` attributes ya existen en el DOM, la fórmula es determinista, y `seekToBeat` ya está implementado. No requiere nuevos data attributes.

### 3.2 Propagación del Seek

El click en un acorde debe:
1. Llamar a `autoScroll.seekToBeat(targetBeat)` → mueve Tone.js Transport
2. El loop de `useBPMSync` detecta la nueva posición → dispara `onBeatChange`
3. `useSmartAutoScroll.handleBeatChange` actualiza `currentElementId` + scroll
4. `useMetronomeSound` reacciona al nuevo `currentBeatInBar` → sincroniza clicks
5. El highlight CSS se actualiza automáticamente (ya depende de `currentElementId` + `currentBeat`)

**No se requiere** lógica adicional de sincronización: el sistema ya converge correctamente.

### 3.3 Comportamiento de Seek según Estado

| Estado actual | Comportamiento del click |
|---------------|--------------------------|
| Reproduciendo + AutoScroll ON | Seek directo, continúa reproducción |
| Pausado + AutoScroll ON | Seek directo, queda pausado en nueva posición |
| Reproduciendo + AutoScroll OFF | No-op (sin timeline activo, no hay beat mapping) |
| AutoScroll Fallback | No-op (timeline falló, no hay mapping confiable) |

### 3.4 Callback Architecture

**Decisión**: Pasar un callback `onChordClick(elementId, chordIndex)` desde `SongPlayerContent` a `ChordOverlay` → `LyricBarGrid` / `InstrumentalSection`.

Dentro de `SongPlayerContent`, el handler:
```
function handleChordClick(elementId: string, chordIndex: number | null) {
  if (!autoScroll.isReady || autoScroll.hasFallback) return
  const element = timeline.elements.find(e => e.id === elementId)
  if (!element) return
  const targetBeat = chordIndex !== null
    ? element.startBeat + (chordIndex * beatsPerBar)
    : element.startBeat
  autoScroll.seekToBeat(targetBeat)
}
```

### 3.5 Previous / Next en Modo Individual

**Estado actual**: Previous/Next solo existe en setlist mode (`SetlistContext`).

**Decisión**: En modo canción individual (`/song/$songId`), agregar:
- **Previous** (SkipBack): Reset al inicio de la canción (`autoScroll.reset()`)
- **Next** (SkipForward): Navegar a la siguiente canción en la setlist **solo si** el contexto de setlist existe. En modo individual, este botón no se muestra.

Esto implica:
- En `PlayerControls`, agregar botón Previous (restart) siempre visible.
- No agregar Next en modo individual (no hay concepto de "siguiente canción" sin setlist).
- Los botones Previous/Next de setlist mode ya existen en el header.

**Refinamiento**: El botón Previous en `PlayerControls` será un **restart** universal:
- 1er click: Vuelve al inicio de la canción (`autoScroll.reset()` + scroll to top)
- En setlist mode, el Previous del header ya navega a la canción anterior.

---

## 4. Fases de Implementación

### Fase 1: Seek-to-Section Core

**Objetivo**: Hacer que al clickear cualquier acorde/celda en `ChordOverlay`, la reproducción salte a esa posición musical.

**Entregables**:
1. Callback `onChordClick(elementId: string, chordIndex: number | null)` en `SongPlayerContent`
2. Prop `onChordClick` propagada a `ChordOverlay` → `ChordOverlayLine` → `LyricBarGrid` / `InstrumentalSection`
3. Cursor `pointer` y hover feedback visual en celdas clickeables (solo cuando AutoScroll está activo)
4. Lógica de seek: calcular `targetBeat` y llamar `autoScroll.seekToBeat()`

**Archivos a modificar**:
- `app/components/player/SongPlayerContent.tsx` — handler + wiring
- `app/components/player/ChordOverlay.tsx` — prop drilling + event binding
- `app/components/player/LyricBarGrid.tsx` — onClick en celdas `data-chord-index`
- `app/components/player/InstrumentalSection.tsx` — onClick en celdas `data-chord-index`

**Archivos que NO se modifican**: hooks, timeline, parser, types.

### Fase 2: Exposición del Timeline para Seek

**Objetivo**: Hacer accesible la información del timeline dentro de `SongPlayerContent` para poder resolver `elementId → startBeat`.

**Entregables**:
1. Exponer `timeline` (o un getter `getElementById`) desde `useSmartAutoScroll` para que `SongPlayerContent` pueda acceder a `element.startBeat`
2. Alternativa más simple: exponer la función `seekToElement(elementId, chordIndex?)` directamente desde `useSmartAutoScroll`, encapsulando toda la lógica de seek.

**Decisión**: Opción B — exponer `seekToElement(elementId: string, chordIndex?: number)` desde `useSmartAutoScroll`. Es más limpio porque:
- No expone internals del timeline al componente
- Encapsula la fórmula `startBeat + chordIndex * beatsPerBar`
- El componente solo necesita saber `elementId` y `chordIndex` (que ya tiene del DOM)

**Archivos a modificar**:
- `app/hooks/useSmartAutoScroll.ts` — agregar `seekToElement()` al return
- `app/components/player/SongPlayerContent.tsx` — usar `autoScroll.seekToElement()`

### Fase 3: Restart Button en PlayerControls

**Objetivo**: Agregar botón de restart (Previous/SkipBack) en la barra de controles.

**Entregables**:
1. Botón con ícono `SkipBack` en `PlayerControls`, a la izquierda del botón Play/Pause
2. Al presionar: `autoScroll.reset()` + scroll container al top + mantener estado play/pause actual
3. Visual feedback (scale animation al press)

**Archivos a modificar**:
- `app/components/player/PlayerControls.tsx` — nuevo botón + prop
- `app/components/player/SongPlayerContent.tsx` — handler de restart

### Fase 4: Visual Feedback & Polish

**Objetivo**: Asegurar que la interacción de seek sea visualmente clara e intuitiva.

**Entregables**:
1. **Cursor**: `cursor-pointer` en celdas de acordes cuando AutoScroll está activo
2. **Hover**: Sutil background highlight en la celda al hacer hover (diferente del highlight de playback)
3. **Tap feedback**: Scale animation momentánea al hacer click (mobile-friendly)
4. **Estado deshabilitado**: Sin cursor pointer ni hover cuando AutoScroll está OFF o en fallback
5. **Tooltip/hint** (opcional): Texto sutil "Tap to play from here" en la primera sesión

**Archivos a modificar**:
- `app/components/player/LyricBarGrid.tsx` — estilos condicionales
- `app/components/player/InstrumentalSection.tsx` — estilos condicionales
- `app/styles/globals.css` — animaciones si se necesitan

### Fase 5: Testing

**Objetivo**: Cobertura de tests para la nueva funcionalidad.

**Entregables**:
1. **Unit tests** para `seekToElement()` en `useSmartAutoScroll`:
   - Seek a elemento con chordIndex → beat correcto
   - Seek a elemento sin chordIndex → startBeat
   - Seek cuando timeline no está listo → no-op
   - Seek en fallback mode → no-op
2. **Unit tests** para `seekToBeat()` en `useBPMSync`:
   - Ya existente — verificar que no se rompe con nuevos valores
3. **Integration tests** para componentes:
   - Click en celda de acorde dispara callback con elementId + chordIndex correctos
   - Click deshabilitado cuando AutoScroll OFF

**Archivos nuevos**:
- `app/hooks/__tests__/useSmartAutoScroll.seek.test.ts`
- `app/components/player/__tests__/ChordOverlay.seek.test.tsx` (o similar)

---

## 5. Reglas y Restricciones

### 5.1 Invariantes (no redefinir en fases posteriores)

1. **El seek se basa en el timeline existente** — no se crea un sistema de seeking paralelo.
2. **`seekToBeat()` de `useBPMSync` es la única forma de mover el Transport** — todo seek pasa por ahí.
3. **El seek solo funciona cuando `isAutoScrollEnabled && !hasFallback && isReady`** — en cualquier otro estado, los clicks en acordes no tienen efecto de seek.
4. **No se modifica la estructura de `TimelineElement`** — no se agregan campos nuevos.
5. **No se modifica el parser de ChordPro** — la estructura `AnyParsedLine` permanece intacta.
6. **Los `data-*` attributes existentes son suficientes** — no se inventan nuevos atributos DOM para seek.
7. **El botón Restart en `PlayerControls` reset a beat 0** — no implementa "ir a canción anterior" fuera de setlist mode.
8. **El seek es instantáneo** — no hay animación de transición de beat a beat; el Transport salta directamente.

### 5.2 Convenciones de Código

- Seguir naming existente (`camelCase` para funciones, `PascalCase` para componentes)
- Callbacks siguen patrón `on[Action]` en props, `handle[Action]` en implementación
- Props se pasan explícitamente (no context API para esto)
- Tests usan Vitest + React Testing Library (patrón existente)

### 5.3 Compatibilidad

- Mobile: los clicks/taps deben funcionar sin delay (no `onClick` con 300ms delay)
- El seek no debe interrumpir la reproducción de metrónomo más allá del salto natural
- El scroll visual post-seek debe usar el mismo `smoothScrollTo` existente

---

## 6. Dependencias entre Fases

```
Fase 2 (seekToElement en hook)
  └──→ Fase 1 (click handlers en componentes) — necesita seekToElement()
         └──→ Fase 4 (visual feedback) — necesita que el click funcione
                └──→ Fase 5 (testing) — necesita todo implementado

Fase 3 (restart button) — independiente, puede ir en paralelo con Fase 1/2
```

**Orden recomendado**: Fase 2 → Fase 1 → Fase 3 (paralelo) → Fase 4 → Fase 5

---

## 7. Resumen de Archivos Afectados

| Archivo | Tipo de cambio |
|---------|---------------|
| `app/hooks/useSmartAutoScroll.ts` | Agregar `seekToElement()` |
| `app/components/player/SongPlayerContent.tsx` | Handler + wiring + restart |
| `app/components/player/ChordOverlay.tsx` | Prop `onChordClick` + propagación |
| `app/components/player/LyricBarGrid.tsx` | onClick en celdas + hover styles |
| `app/components/player/InstrumentalSection.tsx` | onClick en celdas + hover styles |
| `app/components/player/PlayerControls.tsx` | Botón restart |
| `app/hooks/__tests__/useSmartAutoScroll.seek.test.ts` | Tests nuevos |
| `app/components/player/__tests__/ChordOverlay.seek.test.tsx` | Tests nuevos |

**Archivos que NO se tocan**: `useBPMSync.ts`, `useSongTimeline.ts`, `calculator.ts`, `parser.ts`, types, schemas, routes, DB.
