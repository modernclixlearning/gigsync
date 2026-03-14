# Análisis Pre-Master-Plan: Selección, Extensión y Subdivisión de Celdas de Acordes

**Fecha**: 14 de Marzo, 2026  
**Estado**: Completado — Ambigüedades resueltas en [plan-chord-cell-editor.md](plan-chord-cell-editor.md)  
**Alcance**: Editor de duración por celda de acorde (selección, extensión, subdivisión con grid subyacente)

---

## 📋 Contexto del Sistema Actual

Antes de identificar los requisitos, es necesario describir qué existe hoy para dimensionar correctamente el problema.

### Modelo actual de duración por celda

| Tipo de línea | Duración por celda | Base |
|---|---|---|
| instrumental | `bar.beats ?? beatsPerBar` | Explícito por barra |
| chords-only | `bar.beats ?? beatsPerBar` | Explícito por barra |
| lyric con acordes | `durationBeats / chordCount` | Estimado: tiempo total ÷ nº acordes |
| lyric sin acordes | `defaultBarsPerLine × beatsPerBar` | Estimado global |

### ❗ Brecha Crítica

Las celdas de acordes en líneas líricas (`LyricBarGrid`) **no tienen duración propia** — se deriva dividiendo el tiempo total de la línea entre el número de acordes. Cada `ChordPosition` tiene solo `position` (posición en el texto) y `chord` (nombre del acorde). **No hay campo de duración.**

Las celdas instrumentales y de chords-only ya tienen `bar.beats?: number` en `ChordBar`, lo que permite barras con duración explícita. Son las más cercanas al modelo pedido.

---

## 1. 🎯 Objetivos Funcionales

### Explícitos (del enunciado)

- Las celdas que contienen acordes deben ser **seleccionables individualmente**
- Las celdas seleccionadas deben poder **extenderse** (ampliar su duración temporal)
- Las celdas seleccionadas deben poder **subdividirse** (reducir su duración, creando divisiones internas)
- Debe existir una **grid subyacente** que llegue hasta semicorcheas (1/16) como unidad mínima
- La resolución de la grid debe ser **configurable** desde la app en el futuro

### Implícitos (inferidos)

- La selección debe ser visualmente evidente (estado "selected" en la celda)
- La extensión/subdivisión debe hacer **snap a la grid**, no a valores arbitrarios
- El cambio en duración de una celda debe **afectar al timeline** (seek, autoscroll, highlight)
- Extender una celda implica reducir el tiempo de algún otro elemento o agregar tiempo total
- Subdividir implica fragmentar un bloque existente sin alterar la duración total de la línea
- Las celdas de acordes en líneas líricas deben pasar de **duración estimada a duración explícita** para que la extensión/subdivisión tenga sentido
- El modelo debe ser **persistible** (si el usuario edita, los cambios deben guardarse en la canción)

---

## 2. 🔍 Requisitos Explícitos e Implícitos

### Selección

- ¿Selección simple (una celda a la vez) o múltiple (rango)?
- ¿La selección tiene algún efecto funcional además de habilitar extend/subdivide, o es solo UI?
- ¿La selección persiste entre modos (player ↔ editor)?
- ¿Coexiste con el modo de seek-on-click actual, o lo reemplaza?

### Extensión

- Extender una celda hacia la derecha: ¿de dónde viene el tiempo extra?
  - **Opción A**: Se "roba" tiempo de la celda siguiente
  - **Opción B**: Se añade tiempo a la línea completa (y por ende al timeline global)
- ¿Hay un límite de extensión? ¿Puede una celda extenderse más allá del límite de su línea/sección?
- ¿La extensión es con drag (interacción continua) o con snap discreto (clic para agregar N unidades de grid)?

### Subdivisión

- ¿Subdividir crea celdas vacías (sin acorde) o replica el acorde en cada subdivisión?
- ¿Subdividir es siempre en mitades, o permite división arbitraria alineada a la grid?
- ¿Se puede subdividir hasta la resolución mínima de la grid?

### Grid interna

- El enunciado dice "8 subdivisiones por tiempo" y entre paréntesis dice "semicorcheas"
- **Ambigüedad**: En 4/4, una semicorchea (1/16 note) = 4 por beat (tiempo), no 8
  - 8 subdivisiones por beat correspondería a **fusas** (1/32 notes)
  - 8 subdivisiones por compás en 4/4 correspondería a **corcheas** (1/8 notes)
  - ⚠️ Esta discrepancia debe validarse antes de diseñar el modelo

---

## 3. ⚙️ Restricciones Técnicas

### Modelo de datos (ChordPro)

El formato ChordPro estándar **no tiene soporte nativo** para duración por acorde en líneas líricas. Un acorde en una línea lírica se representa como `[Am]texto`, sin información temporal. Cualquier duración añadida requiere una extensión del formato o un almacenamiento paralelo. Esto afecta:

- El **parser** (`chordpro/parser.ts`) — no produce duraciones por acorde lírico
- El **serializador** (`chordpro/serializer.ts`) — debe poder serializar la nueva duración
- La **persistencia** en IndexedDB (campo `song.lyrics: string`) — puede requerir un campo adicional o una extensión del string ChordPro

### Heterogeneidad de tipos de celda

Existen tres contextos distintos de celda que se comportan diferente hoy y necesitarían tratamiento específico:

| Contexto | Tipo DOM | Tiene beats hoy | Serializable |
|---|---|---|---|
| `InstrumentalSection` | `ChordBar` | ✅ (`ChordBar.beats?`) | ✅ (en ChordPro) |
| chords-only (badges) | `ChordBar` | ✅ (`ChordBar.beats?`) | ✅ |
| `LyricBarGrid` (letra+acorde) | `ChordPosition` | ❌ | ❌ directamente |

**La feature es trivial para los dos primeros y estructuralmente nueva para el tercero.**

### Grid y resolución

La resolución mínima de la grid (semicorcheas o fusas) determina la unidad mínima de snap. Impacta:

- El **BPM sync** (`useBPMSync`) — actualmente opera a nivel de beat, no de subdivisión
- El **seekToElement** — resuelve a beats enteros
- La **granularidad del highlight** por celda activa

### Interacción con el drag-and-drop existente

`ChordOverlay` ya tiene dos modos de interacción sobre las celdas:

- `isSeekEnabled` → click para seek
- `isEditable` → drag para reordenar acordes

La selección y extensión son un **tercer modo de interacción**. La coexistencia con los modos existentes no está definida.

---

## 4. ⚠️ Riesgos e Incógnitas Abiertas

### R1 — Modelo de duración para acordes líricos

El gap más grande: `ChordPosition` (acordes en líneas líricas) **no tiene duración**. Asignar duración explícita requiere un cambio en el tipo de dato, el parser, el serializador y el almacenamiento. Si se implementa solo para instrumental y chords-only, la feature queda incompleta para el caso más común (verso con letra y acorde).

### R2 — Comportamiento de "extender" sobre el tiempo del vecino

No está definido qué sucede con el tiempo que "recibe" o "cede" una celda al extenderse. Si la suma de beats por línea cambia, el timeline global cambia, lo que afecta el autoscroll y el seek de todas las secciones posteriores.

### R3 — Ambigüedad en la resolución de la grid

"8 subdivisiones por tiempo" y "semicorcheas" son contradictorios según la aritmética musical estándar. La resolución afecta todo el sistema de coordenadas temporales.

### R4 — Persistencia del nuevo modelo de duración

El campo `song.lyrics` es un string ChordPro. Si la duración por acorde lírico se almacena en ese string (extensión custom), el formato deja de ser ChordPro estándar. Si se almacena por separado, hay que definir el nuevo campo en el schema de IndexedDB (`songs` table) y los hooks de CRUD.

### R5 — Coexistencia con seek-on-click

Hoy, un click en una celda hace seek. Si ahora el primer click "selecciona" la celda y el seek requiere doble click o diferente gesto, el UX del player en vivo cambia de forma disruptiva para músicos.

### R6 — Subdivisión en líneas líricas sin crear acordes fantasma

Si se subdivide una celda que tiene texto asignado (lyric segment), la subdivisión podría partir el texto en mitades sin que haya un acorde en la segunda mitad. La representación visual y el modelo de datos de ese "vacío" no están definidos.

### R7 — Tiempo máximo configurable vs. BPM Sync

El BPM Sync opera en beats. Si la grid llega a subdivisiones de 1/32, el loop de `onBeatChange` en Tone.js necesitaría una frecuencia de disparo mayor. No está claro si el transport de Tone.js está configurado para subdivisiones tan pequeñas.

---

## 5. ❓ Supuestos a Validar

1. ¿La resolución de la grid es **4 subdivisiones/beat** (semicorcheas = 1/16) o **8** (fusas = 1/32)? — el enunciado es contradictorio.
2. ¿La feature aplica a los **tres tipos de celda** (instrumental, chords-only, lyric+acorde) o solo a instrumental y chords-only? — la brecha de modelo en lyric implica un costo muy diferente.
3. ¿"Seleccionar" tiene efecto en el playback (por ejemplo, playback en loop de la celda seleccionada) o es solo una pre-condición para extend/subdivide?
4. ¿La extensión es siempre hacia la derecha (en dirección al tiempo) o también hacia la izquierda?
5. ¿La grid subyacente es visible (líneas guía en la UI del editor) o completamente invisible y solo afecta el snap?
6. ¿El snap es siempre a la grid mínima configurada, o puede haber snap magnético (se prefiere el punto de snap más cercano)?
7. ¿La feature es solo para el **modo editor** (`isEditable=true`) o también en el modo player durante el playback?
8. ¿Qué es una "subdivisión" de una celda de acordes líricas — crea una nueva celda vacía sin acorde, o inserta un nuevo acorde vacío que el usuario luego rellena?
9. ¿Los cambios de duración por celda deben **guardarse en la song** (persistidos en IndexedDB) o son solo un ajuste temporal del timeline en la sesión de playback?

---

## 6. 📊 Síntesis para el Plan Maestro

El requisito describe un **editor de duración por celda al estilo DAW**. El sistema actual ya tiene los cimientos para instrumental y chords-only (ambos usan `ChordBar.beats`), pero **carece de modelo de duración para acordes en líneas líricas**, el tipo más frecuente en uso real.

### Las tres incógnitas más bloqueantes

| # | Incógnita | Impacto |
|---|---|---|
| 1 | Resolución exacta de la grid (supuesto #1) | Define el sistema de coordenadas temporales completo |
| 2 | Si la feature debe alcanzar líneas líricas (supuesto #2) | Diferencia entre extensión trivial y rediseño de modelo de datos |
| 3 | Comportamiento de extensión sobre el tiempo del vecino (riesgo R2) | Afecta integridad del timeline global |

**Estas deben resolverse antes de que cualquier diseño técnico sea válido.**

---

## 📎 Documentos Relacionados

- [autoscroll-analysis.md](autoscroll-analysis.md) — Análisis del autoscroll sincronizado con BPM
- [plan-seek-to-section.md](plan-seek-to-section.md) — Plan maestro de seek-to-section (arquitectura de referencia)
- [features-status.md](features-status.md) — Estado general de features
