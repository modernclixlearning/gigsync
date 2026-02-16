# Análisis: Autoscroll Sincronizado con BPM

## 📋 Resumen Ejecutivo

Actualmente GigSync tiene un **autoscroll basado en velocidad simple** (pixels por frame). La propuesta es transformarlo en un **autoscroll inteligente sincronizado con el BPM** que siga la estructura musical compás por compás.

---

## 🔍 Estado Actual del Código

### 1. **AutoScroll Actual** (`app/components/player/AutoScroll.tsx`)

#### ✅ Lo que sirve:
- Hook bien estructurado (`useAutoScroll`)
- Uso correcto de `requestAnimationFrame` para animaciones fluidas
- Manejo de referencias para el contenedor a scrollear
- Control de habilitación/deshabilitación

#### ❌ Limitaciones:
- **Velocidad arbitraria**: Mapeo de 0-100 a 0.1-3 pixels/frame sin relación con la música
- **No considera BPM**: La velocidad es independiente del tempo de la canción
- **No estructura musical**: No sabe dónde están los compases, secciones o acordes
- **Lineal y constante**: Scroll uniforme sin considerar la duración real de cada sección
- **Sin sincronización**: No hay concepto de "posición actual en la canción"

```typescript
// Código actual - Velocidad arbitraria
const getPixelsPerFrame = useCallback(() => {
  const minSpeed = 0.1
  const maxSpeed = 3
  return minSpeed + (speed / 100) * (maxSpeed - minSpeed)
}, [speed])
```

### 2. **Parser ChordPro** (`app/lib/chordpro/`)

#### ✅ Lo que sirve y es FUNDAMENTAL:
- **Parser robusto**: Ya identifica secciones, acordes, letra y estructura
- **Tipos de línea bien definidos**:
  - `'section'`: [Verse], [Chorus], etc.
  - `'instrumental'`: [Intro | 4 bars] con progresión de acordes
  - `'lyric'`: Líneas con letra y acordes
  - `'chords-only'`: Solo acordes (Am | G | C | F)
  - `'empty'`: Líneas vacías
  
- **Información de estructura musical**:
  - `ChordBar[]`: Barras/compases con acordes
  - `InstrumentalSection`: Secciones con cantidad de compases definidos
  - `ChordPosition[]`: Posición exacta de acordes en el texto

#### 💡 Oportunidades:
- Ya tenemos la información estructural necesaria
- Sabemos cuántos compases tiene cada sección
- Conocemos qué acordes están en cada compás
- Podemos calcular la duración de cada elemento

### 3. **Player State** (`app/hooks/useSongs.ts`)

#### ✅ Lo que sirve:
```typescript
interface SongPlayerState {
  isPlaying: boolean
  currentPosition: number      // ✅ Existe pero no se usa bien
  autoScrollSpeed: number      // ❌ Velocidad arbitraria
  isAutoScrollEnabled: boolean // ✅ Toggle funcional
  transpose: number            // ✅ Funcional
  showChords: boolean          // ✅ Funcional
  fontSize: number             // ✅ Funcional
}
```

#### ⚠️ Falta:
- **`currentBar`**: Compás actual de reproducción
- **`currentBeat`**: Beat actual dentro del compás
- **`songStructureMap`**: Mapa de duración y posición de cada elemento
- **Sincronización con tiempo real**: Conexión entre tiempo transcurrido y posición musical

### 4. **Metrónomo** (`app/hooks/useMetronome.ts`)

#### ✅ Lo que sirve y es REUTILIZABLE:
```typescript
export interface MetronomeState {
  isPlaying: boolean
  bpm: number              // ✅ Ya maneja BPM
  currentBeat: number      // ✅ Ya rastrea beats
  timeSignature: string    // ✅ Ya parsea compases (4/4, 3/4, etc.)
}
```

- **Tone.js**: Ya usa una biblioteca de audio profesional
- **Loop preciso**: Ya tiene un loop sincronizado con BPM
- **Parseador de time signature**: Ya entiende compases complejos
- **Transport de Tone.js**: Sistema de tiempo musical profesional

#### 💡 Oportunidad Principal:
**El metrónomo ya tiene TODO el sistema de timing que necesitamos**. Podemos:
1. Reutilizar su loop de beats
2. Usar su sistema de BPM
3. Aprovechar Tone.js Transport para sincronización precisa

### 5. **Información de Canciones** (`app/types/song.ts`)

#### ✅ Lo que sirve:
```typescript
interface Song {
  bpm: number           // ✅ BPM de la canción
  timeSignature: string // ✅ Time signature (4/4, etc.)
  lyrics: string        // ✅ Letra en formato ChordPro
  // ... otros campos
}
```

Toda la información musical necesaria ya está almacenada.

---

## 🎯 Propuesta de Implementación

### Concepto: "Song Structure Timeline"

En lugar de scroll "ciego" a velocidad constante, crear un **timeline musical** donde cada elemento tiene:

1. **Posición temporal** (en beats o segundos)
2. **Duración** (en beats o compases)
3. **Posición visual** (offset en pixels en el DOM)

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────┐
│  SongTimelineEngine                         │
│  - Parsea estructura musical                │
│  - Calcula duración de cada sección         │
│  - Mapea posición tiempo ↔ posición visual  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  BPM Sync Engine (Tone.js Transport)       │
│  - Mantiene tiempo musical actual           │
│  - Emite eventos: onBeatChange, onBarChange │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  SmartAutoScroll                            │
│  - Escucha posición musical                 │
│  - Scroll suave entre elementos             │
│  - Mantiene contexto visible                │
└─────────────────────────────────────────────┘
```

### Componentes Nuevos a Crear

#### 1. **`useSongTimeline()`** Hook
```typescript
interface SongTimelineReturn {
  // Timeline de la canción
  timeline: TimelineElement[]
  
  // Navegación
  currentElement: TimelineElement | null
  currentBar: number
  currentBeat: number
  
  // Métodos
  getElementAtBeat(beat: number): TimelineElement
  getScrollPositionForBeat(beat: number): number
  getDurationInBeats(): number
  
  // Estado
  isReady: boolean
}

interface TimelineElement {
  id: string
  type: 'section' | 'lyric' | 'instrumental' | 'chords-only'
  
  // Timing musical
  startBeat: number
  endBeat: number
  durationBeats: number
  bars: number
  
  // Posición visual
  domRef?: RefObject<HTMLElement>
  scrollPosition?: number  // Calculado dinámicamente
  
  // Contenido
  content: AnyParsedLine
}
```

**Responsabilidades:**
- Parsear la canción con `parseChordPro()`
- Asignar duración en beats a cada elemento:
  - Secciones instrumentales: `bars * beatsPerBar`
  - Líneas con letra: Estimar duración basada en complejidad o usar default (ej: 2 compases)
  - Líneas de acordes: `número_de_acordes * beatsPerBar`
- Crear un array ordenado de elementos con posición temporal
- Mapear posiciones visuales (usando refs a elementos DOM)

#### 2. **`useBPMSync()`** Hook
```typescript
interface BPMSyncReturn {
  // Tiempo musical
  currentBeat: number
  currentBar: number
  isPlaying: boolean
  
  // Control
  play(): void
  pause(): void
  stop(): void
  seekToBeat(beat: number): void
  seekToBar(bar: number): void
  
  // Configuración
  setBPM(bpm: number): void
  setTimeSignature(sig: string): void
  
  // Callbacks
  onBeatChange: (beat: number) => void
  onBarChange: (bar: number) => void
}
```

**Responsabilidades:**
- Usar `Tone.Transport` para tiempo musical preciso
- Mantener contador de beats desde inicio de canción
- Convertir beats a compases basado en time signature
- Emitir eventos cuando cambia beat/bar
- **REUTILIZAR código del metrónomo existente**

#### 3. **`useSmartAutoScroll()`** Hook (reemplazo de `useAutoScroll`)
```typescript
interface SmartAutoScrollOptions {
  containerRef: RefObject<HTMLElement>
  timeline: TimelineElement[]
  currentBeat: number
  isEnabled: boolean
  
  // Opciones de visualización
  contextBars?: number  // Cuántos compases mantener visibles arriba/abajo
  smoothness?: number   // 0-100, velocidad de interpolación
}
```

**Responsabilidades:**
- Recibir `currentBeat` del `useBPMSync()`
- Buscar elemento actual en el timeline
- Calcular posición de scroll target
- Aplicar scroll suave con "look-ahead" (mantener contexto visible)
- Usar interpolación para transiciones suaves entre elementos

#### 4. **`SongStructureVisualizer`** Componente (Opcional, para v2)
Barra visual que muestra:
- Estructura completa de la canción (minimap)
- Posición actual
- Navegación por secciones

---

## 🎼 Algoritmo de Cálculo de Duración

### Principios:

1. **Secciones instrumentales explícitas**: Duración ya definida
   ```
   [Intro | 4 bars]
   Am | G | C | F |  → 4 compases explícitos
   ```

2. **Líneas de letra con acordes**: Estimar duración
   - **Opción A - Simple**: 1-2 compases por línea (configurable)
   - **Opción B - Inteligente**: Analizar densidad de acordes
     ```
     "Esta línea tiene muchos [Am]cambios [G]de [C]acordes [F]aquí"
     → 4 acordes = probablemente 4 compases o 2 compases (2 acordes por compás)
     ```

3. **Líneas vacías**: No duración (spacing visual)

4. **Líneas sin acordes**: Usar duración de línea anterior o default

### Ejemplo de Cálculo:

```chordpro
[Intro | 4 bars]
Am | G | C | F |

[Verse]
[Am]Esta es la primera [G]línea
[C]Esta es la segunda [F]línea

[Chorus]
[Am]Coro coro [G]coro
[C]Canta fuerte [F]ya
```

**Timeline calculado** (asumiendo 4/4):

| Elemento | Tipo | Start Beat | Duration Beats | End Beat |
|----------|------|------------|----------------|----------|
| [Intro] | instrumental | 0 | 16 (4 bars) | 16 |
| Línea 1 (Verse) | lyric | 16 | 8 (2 bars, 2 acordes) | 24 |
| Línea 2 (Verse) | lyric | 24 | 8 (2 bars, 2 acordes) | 32 |
| Línea 1 (Chorus) | lyric | 32 | 8 | 40 |
| Línea 2 (Chorus) | lyric | 40 | 8 | 48 |

---

## 🖼️ Mantener Contexto Visual

### Problema:
No queremos que el scroll sea como "teleprompter" donde solo ves la línea actual. Queremos **contexto**: ver de dónde venimos y hacia dónde vamos.

### Solución: "Context Window"

```
┌─────────────────────────┐
│  [Previous section]     │ ← Context arriba (gris/dimmed)
│  Previous line...       │
├─────────────────────────┤
│  ► CURRENT LINE ◄       │ ← Línea actual (centrada, resaltada)
│  [Am]      [G]          │
├─────────────────────────┤
│  Next line...           │ ← Context abajo
│  [Upcoming Section]     │
└─────────────────────────┘
```

### Implementación:

```typescript
// Calcular scroll position manteniendo contexto
function calculateScrollPosition(
  currentElement: TimelineElement,
  containerHeight: number,
  contextBars: number = 2
): number {
  const currentPos = currentElement.scrollPosition
  
  // Posicionar elemento actual en el tercio superior
  // (no en el centro, para ver más "hacia adelante")
  const targetOffset = containerHeight * 0.33
  
  return currentPos - targetOffset
}
```

### Interpolación Suave:

```typescript
// En lugar de saltar, interpolar
const smoothScroll = (from: number, to: number, progress: number) => {
  // Ease-out curve para naturalidad
  const eased = 1 - Math.pow(1 - progress, 3)
  return from + (to - from) * eased
}
```

---

## 📊 Métricas de Éxito

### Sincronización:
- ✅ El scroll debe estar sincronizado con el BPM ±50ms
- ✅ Cambios de sección deben ser precisos

### UX:
- ✅ Siempre visible: línea anterior + actual + siguiente
- ✅ Smooth: Transiciones suaves, no saltos bruscos
- ✅ Predecible: Músico puede anticipar scroll

### Configurabilidad:
- ✅ Ajuste de "contexto" (cuántas líneas ver arriba/abajo)
- ✅ Ajuste de "smoothness" (velocidad de interpolación)
- ✅ Manual override: Usuario puede scrollear manualmente y retomar sync

---

## 🚀 Plan de Implementación (Fases)

### **Fase 1: Fundamentos** (Core System)
1. Crear `useSongTimeline()` con cálculo básico de duración
2. Crear `useBPMSync()` reutilizando código del metrónomo
3. Pruebas con canciones simples

### **Fase 2: Smart Scroll** (Autoscroll Inteligente)
4. Crear `useSmartAutoScroll()` con interpolación
5. Implementar context window
6. Ajustes de smoothness

### **Fase 3: Refinamiento** (Polish)
7. Mejorar algoritmo de estimación de duración
8. Permitir override manual de duración por sección
9. Persistir ajustes personalizados por canción
10. Indicadores visuales de posición (highlight línea actual)

### **Fase 4: Features Avanzados** (Nice-to-have)
11. Song structure visualizer (minimap)
12. Navegación por secciones (tap en section → jump)
13. Modo "ensayo" con loop de secciones
14. Exportar/importar timing maps

---

## 🔧 Configuración Propuesta

### Settings de Usuario:
```typescript
interface AutoScrollSettings {
  // Estimación de duración
  defaultBarsPerLine: number  // Default: 2
  defaultBeatsPerChord: number // Default: 4 (1 bar en 4/4)
  
  // Visualización
  contextBars: number         // Default: 2 (ver 2 compases antes/después)
  smoothness: number          // 0-100, default: 70
  highlightCurrentLine: boolean // Default: true
  
  // Comportamiento
  autoResumeAfterManualScroll: boolean // Default: true (retomar después de 3s)
  prerollBars: number         // Compases silenciosos antes de empezar (default: 1)
}
```

---

## ⚠️ Desafíos Técnicos

### 1. **Estimación de Duración**
- **Problema**: No todas las canciones tienen duración explícita
- **Solución**: 
  - Usar defaults inteligentes
  - Permitir calibración manual
  - Machine learning futuro (detectar patrones)

### 2. **Scroll Performance**
- **Problema**: `requestAnimationFrame` + DOM measurement puede ser costoso
- **Solución**:
  - Cachear posiciones DOM
  - Usar `IntersectionObserver` para lazy measurement
  - Throttle de updates (60fps es suficiente)

### 3. **Sincronización Inicial**
- **Problema**: Coordinar inicio de Tone.Transport + scroll + UI
- **Solución**:
  - Preroll configurable (contar "1, 2, 3, 4" antes de empezar)
  - Estados de carga claros

### 4. **Cambios Dinámicos**
- **Problema**: Usuario edita canción mientras reproduce
- **Solución**:
  - Recalcular timeline on-the-fly
  - Mantener posición relativa (% de canción)

---

## 💭 Notas Adicionales

### Ventaja de ChordPro:
El formato ChordPro es **perfecto** para esto porque:
- Es texto estructurado (fácil parsear)
- Incluye metadatos (BPM, time signature)
- Secciones explícitas
- Acordes posicionados (podemos inferir timing)

### Inspiración:
Pensar en aplicaciones como:
- **Ultimate Guitar** (tabs con autoscroll)
- **OnSong** (app profesional de setlists)
- **Teleprompter apps** (pero mejor, con estructura musical)

### Diferenciador:
La mayoría de apps de letras tienen autoscroll "tonto" (velocidad constante). 
**GigSync sería única** con autoscroll consciente de estructura musical.

---

## ✅ Resumen

### ¿Qué sirve del código actual?
1. ✅ Parser ChordPro robusto
2. ✅ Sistema de metrónomo con Tone.js
3. ✅ Estructura de componentes de player
4. ✅ State management con React Query

### ¿Qué hay que cambiar?
1. ❌ Reemplazar autoscroll simple por smart autoscroll
2. ❌ Agregar sistema de timeline musical
3. ❌ Integrar Tone.Transport para sincronización
4. ❌ Calcular duraciones de elementos musicales

### ¿Próximos pasos?
1. Validar este análisis con el usuario
2. Crear prototipos de los hooks principales
3. Iterar con canciones reales
4. Refinar algoritmos de duración

---

**Fecha de análisis**: Febrero 9, 2026  
**Estado**: ✅ Análisis completo - Listo para implementación
