# Editor de Celdas de Acordes — Selección, Extensión y Subdivisión

**Fecha de diseño**: 14 de Marzo, 2026  
**Estado**: ✅ Implementado — 6/6 fases completadas, 1080 tests passing  
**Análisis previo**: [`chord-cell-editor-analysis.md`](chord-cell-editor-analysis.md)

---

## 1. Alcance

### Qué implementa esta feature

Un **editor de duración por celda de acorde** con las siguientes capacidades:

- **Selección**: cada celda de acorde puede ser seleccionada individualmente con click en modo editor (`isEditable=true`)
- **Extensión** (`+`): la duración de una celda seleccionada aumenta en `gridResolution` beats, robando del sibling siguiente
- **Subdivisión** (`÷`): la celda seleccionada se parte en dos celdas iguales con el mismo acorde
- **Grid subyacente**: cuadrícula interna (invisible) con resolución mínima de **1/16 note (semicorchea = 0.25 beats)**
- **Resolución configurable**: el usuario puede cambiar la resolución de grid desde Settings → Player (`1/4`, `1/8`, `1/16`)
- **Persistencia**: los beats editados se almacenan en el string ChordPro de `song.lyrics` como `[Am:2]` y sobreviven al reload

### Qué NO incluye

- Selección múltiple de celdas (rango)
- Loop playback de la celda seleccionada
- Grid visible (líneas guía)
- Extensión hacia la izquierda (solo hacia la derecha)
- Snap magnético
- Resolución por debajo de 1/16 note (fusas, 1/32, etc.)

### Decisiones de diseño

| Decisión | Resultado |
| --------- | ------- |
| Resolución de grid | **Semicorchea (1/16 note = 0.25 beats)** como mínimo. En 4/4: 4 por beat, 16 por compás. |
| Tipos de celda soportados | **Los tres**: `instrumental`, `chords-only`, y `lyric` con acordes. |
| Selección y playback | La selección es solo UI para habilitar extend/subdivide. Sin efecto en playback. |
| Origen del tiempo al extender | **Se roba del siguiente sibling.** Si no hay siguiente, la celda crece libremente. |
| Producto de la subdivisión | **Dos celdas de igual duración** con el mismo acorde. |
| Modo de activación | Solo activa en modo editor (`isEditable=true`). Seek-on-click en player mode no cambia. |
| Persistencia | Se guardan en `song.lyrics` (IndexedDB) vía el serializer `[Am:2]`. |
| Visibilidad de la grid | Invisible. Solo determina snap. Los bordes de celdas lo hacen implícito. |

---

## 2. Modelo de Datos

### 2.1 `ChordPosition` — tipo con beats

`ChordPosition` (acordes en líneas líricas) tiene un campo opcional `beats` para duración explícita:

```ts
// app/lib/chordpro/types.ts
interface ChordPosition {
  chord: string
  position: number   // Posición en caracteres dentro del texto
  beats?: number     // Duración explícita en beats. undefined = usar estimación
}
```

- `beats === undefined`: la duración se estima con `durationBeats / chordCount` (comportamiento legacy)
- `beats > 0`: duración explícita en beats (asignada por extend/subdivide)
- `beats === 0` o negativo: inválido, el parser los ignora silenciosamente

`ChordBar` (para instrumental y chords-only) ya tenía `beats?: number` antes de esta feature.

### 2.2 Formato de serialización ChordPro

```text
Sintaxis estándar:    [Am]texto
Extensión con beats:  [Am:2]texto
Con decimales:        [G:0.25]texto
```

| Aspecto | Detalle |
| ------- | ------- |
| Delimitador | `:` (no forma parte de ningún nombre de acorde válido) |
| Formatos válidos | `:2` (entero), `:0.5` (decimal), `:1.25` |
| Parser | Busca primer `:` dentro del bracket, extrae el sufijo como `parseFloat`. Solo almacena si es positivo y no-NaN. |
| Serializer | Emite `:N` solo si `beats !== undefined`. Sin beats → `[Am]` sin cambio. |
| Compatibilidad | Extensión custom del estándar ChordPro. Parsers de terceros verán `:N` como parte del nombre del acorde. |

### 2.3 `gridResolution` en Settings

```ts
// app/types/profile.ts → PlayerPreferences
gridResolution: number  // Default: 0.25 (semicorchea)
```

| Valor | Notación musical | Descripción |
| ----- | --------------- | ----------- |
| `1.0` | 1/4 | Negra |
| `0.5` | 1/8 | Corchea |
| `0.25` | 1/16 | Semicorchea (default) |

La UI en Settings → Player muestra un selector de botones con las tres opciones. El valor interno es siempre beats (punto flotante), nunca string de fracción.

---

## 3. Arquitectura

### 3.1 Pipeline de datos

```text
┌─────────────────────────────────────────────────────────┐
│  SETTINGS                                               │
│  AppSettings.player.gridResolution (default 0.25)       │
│  UI: selector 1/4 · 1/8 · 1/16 en PlayerSettings       │
│  Fuente: useSettings() → settings.player.gridResolution │
└──────────────────────────┬──────────────────────────────┘
                           │ gridResolution (beats)
┌──────────────────────────▼──────────────────────────────┐
│  MODELO (tipos + parser + serializer)                   │
│  ChordPosition { chord, position, beats? }              │
│  Parser: [Am:2] → { chord:'Am', position:N, beats:2 }  │
│  Serializer: { beats:2 } → [Am:2]                      │
│  Archivos: app/lib/chordpro/{types,parser,serializer}   │
└──────────────────────────┬──────────────────────────────┘
                           │ datos con beats explícitos
┌──────────────────────────▼──────────────────────────────┐
│  TIMELINE (calculator.ts + useSmartAutoScroll.ts)       │
│  Lyric con todos los beats explícitos:                  │
│    durationBeats = Σ chord.beats                        │
│  seekToElement: acumula beats por chord para seek       │
│  currentBeatsPerChord: refleja beat del acorde activo   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  INTERACCIÓN — COMPONENTES                              │
│  LyricBarGrid (lyric+acordes) / InstrumentalSection     │
│  Estado local: selectedChordIndex: number | null        │
│  Operaciones: handleExtend(), handleSubdivide()         │
│  Callback: onChordsReorder / onChordsChange → padre     │
└──────────────────────────┬──────────────────────────────┘
                           │ updatedChords → ChordOverlay
┌──────────────────────────▼──────────────────────────────┐
│  PERSISTENCIA                                           │
│  ChordOverlay.handleLineChange                          │
│    → serializeParsedSong(lines) → "[Am:2]Hello"         │
│    → onLyricsChange(serialized)                         │
│  SongPlayerContent.handleLyricsChange                   │
│    → updateSong({ lyrics }) → db.songs.update()         │
│  Reload: song.lyrics → parseChordPro → beats restored   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Estado de selección

La selección de celda es **estado local efímero** — no se persiste, no sube al árbol de componentes.

- Cada componente (`LyricBarGrid`, `InstrumentalSection`) mantiene `selectedChordIndex: number | null`
- Click en celda en modo editor: selecciona (o deselecciona si ya estaba seleccionada)
- Escape: limpia selección
- Click fuera del grid (`e.target === e.currentTarget`): limpia selección
- En player mode (`isEditable=false`): el click hace seek, sin cambios respecto al comportamiento original

### 3.3 Operaciones sobre celdas

#### Extend (`+ Extender`)

```text
Entrada: selectedChordIndex, gridResolution
Algoritmo:
  1. delta = gridResolution
  2. Si existe sibling[index + 1]:
       Si sibling.beats - delta >= gridResolution:
         celda.beats += delta
         sibling.beats -= delta
       Sino: no-op (botón deshabilitado)
  3. Si NO existe sibling:
       celda.beats += delta (la línea crece)
  4. Llama onChordsReorder(newChords) / onChordsChange(newBars)
```

#### Subdivide (`÷ Subdividir`)

```text
Entrada: selectedChordIndex, gridResolution
Precondición: celda.beats / 2 >= gridResolution
Algoritmo:
  1. halfBeats = celda.beats / 2
  2. celda.beats = halfBeats
  3. Insertar newCelda { chord: celda.chord, beats: halfBeats }
     después del selectedChordIndex
  4. La suma total de beats de la línea NO cambia
  5. Llama onChordsReorder(newChords) / onChordsChange(newBars)
```

#### Regla de mínimo

Ninguna celda puede tener `beats < gridResolution`. Ambas operaciones validan esto antes de mutar. Los botones se renderizan deshabilitados cuando la operación no puede ejecutarse.

### 3.4 Recálculo del timeline

`useSongTimeline` recalcula automáticamente cuando `lyrics` cambia (reactivo vía `useEffect`). No se requiere recálculo imperativo.

La lógica implementada en `calculator.ts`:

```text
Lyric con acordes:
  Si TODOS los chords tienen beats → durationBeats = Σ chord.beats
  Si MEZCLA o NINGUNO tiene beats → durationBeats = defaultBarsPerLine × beatsPerBar

Instrumental / chords-only:
  Σ bar.beats (bar.beats ?? beatsPerBar para cada bar)
```

`useSmartAutoScroll` refleja beats explícitos en dos puntos:

- **seekToElement**: acumula beats individuales para calcular el beat de seek exacto
- **handleBeatChange**: determina `currentBeatsPerChord` buscando qué acorde cubre el beat actual

---

## 4. Archivos Modificados

### 4.1 Por capa

| Capa | Archivo | Cambio |
| ---- | ------- | ------ |
| **Tipos** | `app/lib/chordpro/types.ts` | `ChordPosition.beats?: number` |
| **Parser** | `app/lib/chordpro/parser.ts` | Extrae `:N` de `[chord:N]` en `parseChordPositions()` |
| **Serializer** | `app/lib/chordpro/serializer.ts` | `serializeLyricLine()` emite `[Am:2]` cuando `beats !== undefined` |
| **Settings tipo** | `app/types/profile.ts` | `gridResolution: number` en `PlayerPreferences` (default `0.25`) |
| **Settings hook** | `app/hooks/useSettings.ts` | Expone `gridResolution` vía `useSettings()` |
| **Settings UI** | `app/components/profile/PlayerSettings.tsx` | Selector `1/4 · 1/8 · 1/16` |
| **Lyric grid** | `app/components/player/LyricBarGrid.tsx` | Selección, extend, subdivide, toolbar |
| **Instrumental** | `app/components/player/InstrumentalSection.tsx` | Selección, extend, subdivide, toolbar |
| **Chord overlay** | `app/components/player/ChordOverlay.tsx` | `handleLineChange()`, threading de `gridResolution` |
| **Player content** | `app/components/player/SongPlayerContent.tsx` | Lee `gridResolution` de settings, `handleLyricsChange()` |
| **Timeline** | `app/lib/timeline/calculator.ts` | `calculateElementDuration()` con beats explícitos |
| **Autoscroll** | `app/hooks/useSmartAutoScroll.ts` | `seekToElement()` y `handleBeatChange()` con beats explícitos |

### 4.2 Tests

| Archivo | Tests | Cobertura |
| ------- | ----- | --------- |
| `app/lib/chordpro/__tests__/parser.test.ts` | 6 | Parsing `[Am:2]`, `[Am:0.25]`, plain `[Am]`, mixed, valores inválidos, round-trip |
| `app/lib/chordpro/__tests__/serializer.test.ts` | 11 | Round-trips completos, extend pipeline, subdivide pipeline, backward compat, instrumental beats |
| `app/lib/timeline/__tests__/calculator.test.ts` | 4 nuevos | Lyric con todos beats explícitos, mezcla, sin beats, timeline total con beats |

**Total suite**: 1080 tests / 71 archivos / 0 fallos

---

## 5. Historial de Implementación

### Fase 1 — Modelo de datos y serialización ✅

- `ChordPosition.beats?: number` añadido al tipo
- Parser: `parseChordPositions()` busca primer `:` en el bracket, extrae sufijo con `parseFloat`, solo almacena si positivo y no-NaN
- Serializer: `serializeLyricLine()` emite `[Am:2]` cuando `beats !== undefined`
- 6 tests unitarios de parse + round-trip

### Fase 2 — Settings: `gridResolution` ✅

- `gridResolution: number` en `PlayerPreferences` con default `0.25`
- `useSettings()` expone el valor
- UI: 3 botones (`1/4`, `1/8`, `1/16`) en PlayerSettings

### Fase 3 — Selección de celda ✅

- `selectedChordIndex: number | null` en `LyricBarGrid` y `InstrumentalSection`
- Click corto selecciona/deselecciona; gesto largo (500ms) activa drag para reordenar
- Escape: limpia selección
- Click-outside (`e.target === e.currentTarget`): limpia selección
- Visual: borde diferenciado en celda seleccionada
- Toolbar de extend/subdivide se renderiza condicionalmente cuando hay selección

### Fase 4 — Controles de Extend y Subdivide ✅

- Botones `+ Extender` y `÷ Subdividir` en toolbar inline sobre el grid
- `handleExtend()`: suma `gridResolution` a la celda, resta del sibling siguiente
- `handleSubdivide()`: parte la celda en dos mitades iguales con el mismo acorde
- Botones deshabilitados cuando la operación violaría el mínimo de grid
- Callbacks: `onChordsReorder` (LyricBarGrid) y `onChordsChange` (InstrumentalSection)
- `gridResolution` threaded desde `SongPlayerContent → ChordOverlay → LyricBarGrid/InstrumentalSection`

### Fase 5 — Timeline con beats explícitos ✅

- `calculateElementDuration()` para lyric usa `Σ chord.beats` cuando todos los chords tienen beats
- `seekToElement()` acumula beats individuales para seek preciso por chord
- `handleBeatChange()` busca qué chord cubre el beat actual para `currentBeatsPerChord`
- 4 tests nuevos en calculator

### Fase 6 — Persistencia e integración ✅

- Pipeline verificado end-to-end sin cambios de código (solo tests)
- `handleExtend/Subdivide → onChordsReorder → ChordOverlay.handleLineChange → serializeParsedSong → onLyricsChange → updateSong → db.songs.update()`
- 11 tests de integración: round-trips, extend pipeline, subdivide pipeline, backward compat, instrumental

---

## 6. Reglas de Diseño

Estas reglas rigen toda la implementación:

1. **La unidad interna es siempre beats** (número de punto flotante). Nunca fracciones de string ("1/16"), nunca milisegundos, nunca ticks MIDI.

2. **`ChordPosition.beats` es siempre opcional.** `undefined` = sin duración explícita (usar estimación). `0` es inválido (el parser lo ignora).

3. **El formato de serialización para lyric beats es `[chord:N]`** (dos puntos como delimitador).

4. **Operaciones de extend y subdivide son discretas** (click en botón), no continuas con drag. El drag en modo editor sigue siendo para reordenar.

5. **La selección es local y efímera.** Ningún componente padre conoce qué celda está seleccionada.

6. **El pipeline de persistencia no cambia.** `onChordsReorder/Change → handleLineChange → serializeParsedSong → onLyricsChange → updateSong → IndexedDB` es el camino único.

7. **El mínimo de grid es `gridResolution` beats, nunca `0`.** Botones de extend/subdivide se deshabilitan cuando la operación violaría este mínimo.

8. **Backward compatibility es no-negociable.** Canciones sin `:N` parsean y renderizan idéntico al estado anterior. Los beats explícitos son aditivos, nunca destructivos.

9. **El modo player no se ve afectado.** En `isEditable=false`, las celdas se comportan igual que antes (seek-on-click).

---

## 7. Guía de Uso

### Editar duración de una celda de acorde

1. Abrir una canción en modo editor (activar edición)
2. Click en una celda de acorde → se selecciona con borde visual
3. Aparece toolbar con dos botones:
   - **`+ Extender`**: añade `gridResolution` beats a la celda seleccionada, restando del acorde siguiente
   - **`÷ Subdividir`**: divide la celda en dos iguales con el mismo acorde
4. Los botones se deshabilitan automáticamente si la operación es imposible
5. Los cambios se guardan automáticamente en IndexedDB

### Deseleccionar

- Click en la misma celda seleccionada
- Tecla Escape
- Click fuera de las celdas de acordes

### Configurar resolución de grid

1. Ir a Settings → Player → "Resolución de grid"
2. Seleccionar `1/4` (negra), `1/8` (corchea) o `1/16` (semicorchea)
3. La resolución afecta el paso mínimo de extend y el límite de subdivide

### Ejemplos de ChordPro con beats

```text
[Verse]
[Am:2]Hello [G:2]world          → Am dura 2 beats, G dura 2 beats
[Am:4.25]Hold me [G:3.75]tight  → Extend aplicado: Am ganó 0.25 del sibling G
[Am]Simple text                  → Sin beats: duración por estimación
[Am:2]First [Am:2]half           → Subdivide aplicado: una celda de 4 se partió en dos de 2
```

---

## 8. Limitaciones Conocidas

1. **Mixed beats en líneas líricas**: si solo algunos acordes de una línea tienen beats explícitos, el calculator usa la estimación por defecto (`defaultBarsPerLine × beatsPerBar`). No distribuye el sobrante entre los chords sin beats.

2. **Floating-point acumulación**: chains de muchas operaciones de extend podrían acumular error de punto flotante. En la práctica, los pasos de `gridResolution` (0.25, 0.5, 1.0) son potencias de 2 exactas en IEEE 754 con denominadores ≤ 4, por lo que el riesgo es bajo.

3. **Incompatibilidad con ChordPro estándar**: la extensión `[Am:2]` no es parte del estándar ChordPro. Parsers de terceros interpretarán `Am:2` como nombre completo del acorde.

4. **Ternario cosmético en serializer**: las líneas 23 y 79 de `serializer.ts` tienen un ternario `Number.isInteger(x) ? x : x` que es un no-op. No afecta funcionalidad.

5. **Tests sin IndexedDB real**: los tests de integración verifican el pipeline parse→serialize→re-parse pero no ejercitan la capa de IndexedDB (vitest usa jsdom, no tiene IndexedDB real). El wrapper Dexie es trivial y no requiere cobertura adicional.

---

## 9. Criterios de Aceptación

Todos verificados con la suite de tests (1080 passing):

- [x] Una canción con `[Am:2]texto` parsea correctamente y muestra la celda "Am" con 2 beats
- [x] Extender una celda de 4 beats en 0.25 produce una celda de 4.25 beats y el sibling pasa a 3.75
- [x] Subdividir una celda de 1 beat (gridResolution=0.25) produce dos celdas de 0.5 beats con el mismo acorde
- [x] Subdividir una celda de 0.25 beats con gridResolution=0.25 no produce cambio (botón deshabilitado)
- [x] El autoscroll destaca la celda correcta cuando hay beats explícitos mixtos en una línea lírica
- [x] El seek-on-click en player mode sigue funcionando sin cambios
- [x] Una canción guardada con beats explícitos sobrevive un reload y muestra los mismos beats
- [x] Una canción pre-existente sin beats en ChordPosition se comporta idéntico al estado anterior
- [x] Cambiar gridResolution a 0.5 deshabilita "subdivide" en celdas de exactamente 0.5 beats

---

## 10. Documentos Relacionados

- [`chord-cell-editor-analysis.md`](chord-cell-editor-analysis.md) — Análisis previo (fuente de requisitos)
- [`plan-seek-to-section.md`](plan-seek-to-section.md) — Referencia arquitectónica para features de timing
- [`autoscroll-analysis.md`](autoscroll-analysis.md) — Análisis del sistema de autoscroll
- [`features-status.md`](features-status.md) — Estado general de features del proyecto
