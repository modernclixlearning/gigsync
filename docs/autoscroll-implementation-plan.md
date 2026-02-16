# Plan de Implementación: Smart Autoscroll

Plan detallado fase por fase para implementar el autoscroll sincronizado con BPM.

---

## 📅 Fases de Implementación

### ✅ Fase 0: Preparación (1-2 horas)

**Objetivo**: Validar análisis y preparar estructura de archivos

- [x] ✅ Análisis completado
- [ ] Crear branch: `feature/smart-autoscroll`
- [ ] Crear estructura de archivos
- [ ] Configurar tests básicos

**Archivos a crear**:
```
app/
  hooks/
    useSongTimeline.ts          # Nuevo
    useBPMSync.ts               # Nuevo
    useSmartAutoScroll.ts       # Nuevo
    __tests__/
      useSongTimeline.test.ts
      useBPMSync.test.ts
  components/
    player/
      AutoScroll.tsx            # Modificar → deprecar
      SmartAutoScroll.tsx       # Nuevo
  lib/
    timeline/
      calculator.ts             # Lógica de cálculo
      types.ts                  # TimelineElement, etc.
  types/
    timeline.ts                 # Nuevos tipos
```

---

## 🎯 Fase 1: Timeline Engine (Core)

**Objetivo**: Crear el sistema de timeline que mapea estructura musical a tiempos

**Tiempo estimado**: 3-4 horas

### 1.1: Tipos y Estructura

**Archivo**: `app/types/timeline.ts`

```typescript
export interface TimelineElement {
  id: string
  type: 'section' | 'lyric' | 'instrumental' | 'chords-only' | 'empty'
  
  // Timing musical
  startBeat: number
  endBeat: number
  durationBeats: number
  bars: number
  
  // Posición visual (será calculada)
  domRef?: RefObject<HTMLElement>
  scrollPosition?: number
  
  // Contenido original
  content: AnyParsedLine
  
  // Override manual (opcional)
  manualDuration?: number
}

export interface SongTimeline {
  elements: TimelineElement[]
  totalBeats: number
  totalBars: number
  totalDurationSeconds: number
  beatsPerBar: number
  bpm: number
}

export interface TimelineCalculationOptions {
  defaultBarsPerLine: number
  defaultBeatsPerChord: number
  intelligentEstimation: boolean
}
```

**Tests**: 
- ✅ Crear timeline vacío
- ✅ Calcular duración total

### 1.2: Calculadora de Duración

**Archivo**: `app/lib/timeline/calculator.ts`

```typescript
/**
 * Calcular duración de un elemento musical en beats
 */
export function calculateElementDuration(
  element: AnyParsedLine,
  options: TimelineCalculationOptions,
  timeSignature: string
): number {
  const beatsPerBar = parseTimeSignature(timeSignature).beats
  
  switch (element.type) {
    case 'instrumental':
      // Duración explícita en bars
      return element.section.bars * beatsPerBar
      
    case 'chords-only':
      // Cada chord bar es un compás
      return element.chordBars.length * beatsPerBar
      
    case 'lyric':
      if (options.intelligentEstimation) {
        return estimateLineDurationIntelligent(element, beatsPerBar)
      }
      return options.defaultBarsPerLine * beatsPerBar
      
    case 'section':
    case 'empty':
      return 0 // No duration
      
    default:
      return 0
  }
}

/**
 * Estimación inteligente basada en densidad de acordes
 */
function estimateLineDurationIntelligent(
  line: LyricParsedLine,
  beatsPerBar: number
): number {
  const chordCount = line.chords.length
  const textLength = line.text.length
  
  // Muchos acordes = más compases
  if (chordCount >= 4) {
    return Math.ceil(chordCount / 1.5) * beatsPerBar
  }
  
  // Texto largo = más compases
  if (chordCount <= 2 && textLength > 40) {
    return 2 * beatsPerBar
  }
  
  // Default: 1-2 compases basado en acordes
  return Math.max(chordCount, 2) * beatsPerBar
}

/**
 * Crear timeline completo desde lyrics
 */
export function createSongTimeline(
  lyrics: string,
  bpm: number,
  timeSignature: string,
  options: TimelineCalculationOptions
): SongTimeline {
  const parsed = parseChordPro(lyrics)
  const elements: TimelineElement[] = []
  
  let currentBeat = 0
  const beatsPerBar = parseTimeSignature(timeSignature).beats
  
  for (const line of parsed.lines) {
    const duration = calculateElementDuration(line, options, timeSignature)
    
    elements.push({
      id: `element-${elements.length}`,
      type: line.type,
      startBeat: currentBeat,
      endBeat: currentBeat + duration,
      durationBeats: duration,
      bars: duration / beatsPerBar,
      content: line
    })
    
    currentBeat += duration
  }
  
  return {
    elements,
    totalBeats: currentBeat,
    totalBars: currentBeat / beatsPerBar,
    totalDurationSeconds: (currentBeat / bpm) * 60,
    beatsPerBar,
    bpm
  }
}
```

**Tests**:
- ✅ Calcular duración de sección instrumental explícita
- ✅ Calcular duración de chord bars
- ✅ Estimar duración de línea con acordes
- ✅ Crear timeline completo de canción simple

### 1.3: Hook useSongTimeline

**Archivo**: `app/hooks/useSongTimeline.ts`

```typescript
export interface UseSongTimelineOptions {
  lyrics: string
  bpm: number
  timeSignature: string
  calculationOptions?: Partial<TimelineCalculationOptions>
}

export interface UseSongTimelineReturn {
  timeline: SongTimeline | null
  isReady: boolean
  
  // Navegación
  getElementAtBeat(beat: number): TimelineElement | null
  getScrollPositionForBeat(beat: number): number
  updateElementPosition(elementId: string, position: number): void
  
  // Override manual
  setCustomDuration(elementId: string, durationBeats: number): void
  
  // Estado
  error: Error | null
}

export function useSongTimeline({
  lyrics,
  bpm,
  timeSignature,
  calculationOptions
}: UseSongTimelineOptions): UseSongTimelineReturn {
  const [timeline, setTimeline] = useState<SongTimeline | null>(null)
  const [elementPositions, setElementPositions] = useState<Map<string, number>>(new Map())
  const [customDurations, setCustomDurations] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<Error | null>(null)
  
  // Calcular timeline cuando cambian inputs
  useEffect(() => {
    try {
      const defaultOptions: TimelineCalculationOptions = {
        defaultBarsPerLine: 2,
        defaultBeatsPerChord: 4,
        intelligentEstimation: true,
        ...calculationOptions
      }
      
      const newTimeline = createSongTimeline(lyrics, bpm, timeSignature, defaultOptions)
      
      // Aplicar custom durations
      if (customDurations.size > 0) {
        newTimeline.elements = applyCustomDurations(newTimeline.elements, customDurations)
      }
      
      setTimeline(newTimeline)
      setError(null)
    } catch (err) {
      setError(err as Error)
      setTimeline(null)
    }
  }, [lyrics, bpm, timeSignature, calculationOptions, customDurations])
  
  const getElementAtBeat = useCallback((beat: number): TimelineElement | null => {
    if (!timeline) return null
    
    return timeline.elements.find(
      el => beat >= el.startBeat && beat < el.endBeat
    ) ?? null
  }, [timeline])
  
  const getScrollPositionForBeat = useCallback((beat: number): number => {
    const element = getElementAtBeat(beat)
    if (!element) return 0
    
    const position = elementPositions.get(element.id)
    return position ?? 0
  }, [getElementAtBeat, elementPositions])
  
  const updateElementPosition = useCallback((elementId: string, position: number) => {
    setElementPositions(prev => new Map(prev).set(elementId, position))
  }, [])
  
  const setCustomDuration = useCallback((elementId: string, durationBeats: number) => {
    setCustomDurations(prev => new Map(prev).set(elementId, durationBeats))
  }, [])
  
  return {
    timeline,
    isReady: timeline !== null,
    getElementAtBeat,
    getScrollPositionForBeat,
    updateElementPosition,
    setCustomDuration,
    error
  }
}
```

**Tests**:
- ✅ Hook inicializa correctamente
- ✅ Recalcula cuando cambia lyrics
- ✅ getElementAtBeat retorna elemento correcto
- ✅ Custom durations se aplican correctamente

---

## 🎵 Fase 2: BPM Sync Engine

**Objetivo**: Sistema de sincronización musical basado en BPM usando Tone.js

**Tiempo estimado**: 2-3 horas

### 2.1: Hook useBPMSync

**Archivo**: `app/hooks/useBPMSync.ts`

```typescript
export interface UseBPMSyncOptions {
  bpm: number
  timeSignature: string
  onBeatChange?: (beat: number) => void
  onBarChange?: (bar: number) => void
}

export interface UseBPMSyncReturn {
  // Estado
  currentBeat: number
  currentBar: number
  isPlaying: boolean
  
  // Control
  play(): Promise<void>
  pause(): void
  stop(): void
  
  // Navegación
  seekToBeat(beat: number): void
  seekToBar(bar: number): void
  
  // Error
  error: string | null
}

export function useBPMSync({
  bpm,
  timeSignature,
  onBeatChange,
  onBarChange
}: UseBPMSyncOptions): UseBPMSyncReturn {
  const [state, setState] = useState({
    currentBeat: 0,
    currentBar: 0,
    isPlaying: false,
    error: null as string | null
  })
  
  const transportRef = useRef<typeof Tone.Transport | null>(null)
  const loopRef = useRef<Tone.Loop | null>(null)
  const beatCountRef = useRef(0)
  
  const { beats: beatsPerBar } = parseTimeSignature(timeSignature)
  
  // Inicializar Tone.js Transport
  useEffect(() => {
    try {
      transportRef.current = Tone.getTransport()
      transportRef.current.bpm.value = bpm
      
      return () => {
        if (loopRef.current) {
          loopRef.current.dispose()
        }
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize audio transport' 
      }))
    }
  }, [])
  
  // Update BPM
  useEffect(() => {
    if (transportRef.current) {
      transportRef.current.bpm.value = bpm
    }
  }, [bpm])
  
  const play = useCallback(async () => {
    if (!transportRef.current) return
    
    try {
      // Resume audio context
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume()
      }
      
      await Tone.start()
      
      // Create loop
      if (loopRef.current) {
        loopRef.current.dispose()
      }
      
      loopRef.current = new Tone.Loop((time) => {
        const currentBeat = beatCountRef.current
        const currentBar = Math.floor(currentBeat / beatsPerBar)
        
        // Update state
        setState(prev => ({ ...prev, currentBeat, currentBar }))
        
        // Callbacks
        onBeatChange?.(currentBeat)
        
        if (currentBeat % beatsPerBar === 0) {
          onBarChange?.(currentBar)
        }
        
        beatCountRef.current++
      }, '4n').start(0)
      
      transportRef.current.start()
      
      setState(prev => ({ ...prev, isPlaying: true, error: null }))
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: (err as Error).message 
      }))
    }
  }, [beatsPerBar, onBeatChange, onBarChange])
  
  const pause = useCallback(() => {
    if (transportRef.current) {
      transportRef.current.pause()
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [])
  
  const stop = useCallback(() => {
    if (transportRef.current) {
      transportRef.current.stop()
      beatCountRef.current = 0
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentBeat: 0, 
        currentBar: 0 
      }))
    }
  }, [])
  
  const seekToBeat = useCallback((beat: number) => {
    beatCountRef.current = beat
    setState(prev => ({ 
      ...prev, 
      currentBeat: beat,
      currentBar: Math.floor(beat / beatsPerBar)
    }))
  }, [beatsPerBar])
  
  const seekToBar = useCallback((bar: number) => {
    const beat = bar * beatsPerBar
    seekToBeat(beat)
  }, [beatsPerBar, seekToBeat])
  
  return {
    currentBeat: state.currentBeat,
    currentBar: state.currentBar,
    isPlaying: state.isPlaying,
    play,
    pause,
    stop,
    seekToBeat,
    seekToBar,
    error: state.error
  }
}
```

**Tests**:
- ✅ Inicia correctamente
- ✅ Cuenta beats correctamente
- ✅ Pausa/resume funciona
- ✅ Seek to beat funciona

---

## 📜 Fase 3: Smart Autoscroll

**Objetivo**: Scroll inteligente sincronizado con timeline

**Tiempo estimado**: 3-4 horas

### 3.1: Hook useSmartAutoScroll

**Archivo**: `app/hooks/useSmartAutoScroll.ts`

```typescript
export interface SmartAutoScrollOptions {
  containerRef: RefObject<HTMLElement>
  timeline: SongTimeline | null
  currentBeat: number
  isEnabled: boolean
  
  // Opciones
  contextWindowRatio?: number  // 0-1, default: 0.33 (tercio superior)
  smoothness?: number          // 0-100, default: 70
  updateElementPositions?: (id: string, pos: number) => void
}

export function useSmartAutoScroll({
  containerRef,
  timeline,
  currentBeat,
  isEnabled,
  contextWindowRatio = 0.33,
  smoothness = 70,
  updateElementPositions
}: SmartAutoScrollOptions): void {
  const animationFrameRef = useRef<number | null>(null)
  const targetScrollRef = useRef<number>(0)
  const currentScrollRef = useRef<number>(0)
  
  // Medir posiciones de elementos en el DOM
  useEffect(() => {
    if (!timeline || !containerRef.current || !updateElementPositions) return
    
    const measurePositions = () => {
      const container = containerRef.current
      if (!container) return
      
      const elements = container.querySelectorAll('[data-timeline-element]')
      
      elements.forEach((el) => {
        const id = el.getAttribute('data-timeline-element')
        if (id) {
          const rect = el.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const position = rect.top - containerRect.top + container.scrollTop
          updateElementPositions(id, position)
        }
      })
    }
    
    // Medir después de render
    const timer = setTimeout(measurePositions, 100)
    
    return () => clearTimeout(timer)
  }, [timeline, containerRef, updateElementPositions])
  
  // Calcular posición target basada en beat actual
  useEffect(() => {
    if (!isEnabled || !timeline || !containerRef.current) return
    
    const container = containerRef.current
    
    // Encontrar elemento actual
    const currentElement = timeline.elements.find(
      el => currentBeat >= el.startBeat && currentBeat < el.endBeat
    )
    
    if (!currentElement || !currentElement.scrollPosition) return
    
    // Calcular target
    const containerHeight = container.clientHeight
    const targetOffset = containerHeight * contextWindowRatio
    
    targetScrollRef.current = Math.max(
      0,
      currentElement.scrollPosition - targetOffset
    )
  }, [currentBeat, timeline, isEnabled, contextWindowRatio])
  
  // Scroll suave con interpolación
  useEffect(() => {
    if (!isEnabled || !containerRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }
    
    const container = containerRef.current
    
    const animate = () => {
      const target = targetScrollRef.current
      const current = currentScrollRef.current
      
      // Interpolación ease-out
      const smoothFactor = smoothness / 100
      const diff = target - current
      const step = diff * smoothFactor * 0.1
      
      if (Math.abs(diff) > 0.5) {
        const newScroll = current + step
        container.scrollTop = newScroll
        currentScrollRef.current = newScroll
        
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Snap to target
        container.scrollTop = target
        currentScrollRef.current = target
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isEnabled, smoothness, containerRef])
}
```

**Tests**:
- ✅ Scroll sigue beat actual
- ✅ Interpolación suave funciona
- ✅ Context window mantiene visibilidad

---

## 🔌 Fase 4: Integración con Player

**Objetivo**: Conectar todos los sistemas con el player existente

**Tiempo estimado**: 2-3 horas

### 4.1: Modificar useSongPlayer

**Archivo**: `app/hooks/useSongs.ts`

```typescript
// Agregar a SongPlayerState
export interface SongPlayerState {
  // ... existing fields
  
  // Nuevo: BPM sync
  currentBeat: number
  currentBar: number
}

// Modificar useSongPlayer
export function useSongPlayer(song?: Song) {
  // ... existing state
  
  // Nuevo: Timeline
  const timeline = useSongTimeline(song ? {
    lyrics: song.lyrics,
    bpm: song.bpm,
    timeSignature: song.timeSignature
  } : null)
  
  // Nuevo: BPM Sync
  const bpmSync = useBPMSync({
    bpm: song?.bpm ?? 120,
    timeSignature: song?.timeSignature ?? '4/4',
    onBeatChange: (beat) => {
      setState(prev => ({ ...prev, currentBeat: beat }))
    },
    onBarChange: (bar) => {
      setState(prev => ({ ...prev, currentBar: bar }))
    }
  })
  
  // Modificar play/pause para controlar BPM sync
  const play = useCallback(() => {
    bpmSync.play()
    setState(prev => ({ ...prev, isPlaying: true }))
  }, [bpmSync])
  
  const pause = useCallback(() => {
    bpmSync.pause()
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [bpmSync])
  
  return {
    state: {
      ...state,
      currentBeat: bpmSync.currentBeat,
      currentBar: bpmSync.currentBar
    },
    play,
    pause,
    timeline,
    // ... resto de métodos
  }
}
```

### 4.2: Modificar SongPlayerPage

**Archivo**: `app/routes/song.$songId.index.tsx`

```typescript
function SongPlayerPage() {
  // ... existing code
  
  const player = useSongPlayer(song)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Nuevo: Smart autoscroll
  useSmartAutoScroll({
    containerRef: scrollContainerRef,
    timeline: player.timeline?.timeline ?? null,
    currentBeat: player.state.currentBeat,
    isEnabled: player.state.isAutoScrollEnabled && player.state.isPlaying,
    updateElementPositions: player.timeline?.updateElementPosition
  })
  
  // ... resto de componente
}
```

### 4.3: Agregar data attributes a elementos

**Archivo**: `app/components/player/LyricsDisplay.tsx`

```typescript
// Agregar timeline element ID
function LyricsLine({ line, elementId }: { line: AnyParsedLine; elementId: string }) {
  return (
    <div data-timeline-element={elementId}>
      {/* ... contenido */}
    </div>
  )
}
```

---

## 🎨 Fase 5: UI/UX Polish

**Objetivo**: Mejorar experiencia visual y feedback

**Tiempo estimado**: 2-3 horas  
**Estado actual**: Implementado en `feature/smart-autoscroll` (highlight de línea actual, VisualBeat, Beat Indicator debug y settings expandidos de Smart Scroll con persistencia)

### 5.1: Highlight Línea Actual

```typescript
// Agregar a PlayerControls o crear nuevo componente
function CurrentLineHighlight({ currentBeat, timeline }) {
  const currentElement = timeline?.getElementAtBeat(currentBeat)
  
  return (
    <style>{`
      [data-timeline-element="${currentElement?.id}"] {
        background: rgba(79, 70, 229, 0.1);
        border-left: 3px solid rgb(79, 70, 229);
        padding-left: 1rem;
        transition: all 0.3s ease;
      }
    `}</style>
  )
}
```

### 5.2: Beat/Bar Indicator (Debug Mode)

```typescript
function BeatIndicator({ beat, bar, totalBars }) {
  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-mono">
      Beat: {beat} | Bar: {bar + 1}/{totalBars}
    </div>
  )
}
```

### 5.3: Settings Expandidos

```typescript
// Agregar a PlayerControls
<div className="settings-panel">
  {/* Existing settings... */}
  
  {/* Nuevo: Smart Scroll Settings */}
  <div className="border-t pt-4 mt-4">
    <h4 className="text-sm font-semibold mb-2">Smart Scroll (Beta)</h4>
    
    <label>
      Context Window
      <input type="range" min="0" max="100" value={contextWindow} />
    </label>
    
    <label>
      Smoothness
      <input type="range" min="0" max="100" value={smoothness} />
    </label>
    
    <label>
      <input type="checkbox" checked={showBeatIndicator} />
      Show beat indicator (debug)
    </label>
  </div>
</div>
```

---

## 🧪 Fase 6: Testing & Refinamiento

**Objetivo**: Validar con canciones reales y ajustar

**Tiempo estimado**: 3-4 horas

### 6.1: Test Cases

1. **Canción simple** (Into, Verse, Chorus, Outro)
2. **Canción con instrumental largo** (Solo de 16+ compases)
3. **Canción en 3/4** (Vals)
4. **Canción con cambios de tempo**
5. **Canción con letra densa**

### 6.2: Métricas a Validar

- [ ] Timeline total ±10% de duración esperada
- [ ] Cambios de sección sincronizados
- [ ] Sin saltos bruscos en scroll
- [ ] Context window mantiene visibilidad
- [ ] Performance: 60fps constante

### 6.3: Refinamientos

- Ajustar heurísticas de duración basado en tests
- Optimizar performance si necesario
- Mejorar animaciones de transición

---

## 📦 Fase 7: Feature Completo

**Objetivo**: Pulir y preparar para producción

**Tiempo estimado**: 2 horas

### 7.1: Checklist

- [ ] Tests unitarios completos
- [ ] Documentación de código
- [ ] Eliminar console.logs
- [ ] Error handling robusto
- [ ] Fallback a autoscroll simple si timeline falla
- [ ] Settings persistidos en localStorage/DB

### 7.2: Optional Features (V2)

- [ ] Song structure minimap
- [ ] Navigation por secciones (tap → jump)
- [ ] Manual duration adjustments UI
- [ ] Export/import timing maps

---

## 📊 Estimación Total

| Fase | Tiempo Estimado |
|------|-----------------|
| 0. Preparación | 1-2h |
| 1. Timeline Engine | 3-4h |
| 2. BPM Sync | 2-3h |
| 3. Smart Autoscroll | 3-4h |
| 4. Integración | 2-3h |
| 5. UI/UX Polish | 2-3h |
| 6. Testing | 3-4h |
| 7. Finalización | 2h |
| **TOTAL** | **18-25 horas** |

---

## 🚀 Próximos Pasos Inmediatos

1. ✅ **Validar análisis con usuario**
2. Crear branch `feature/smart-autoscroll`
3. Empezar con Fase 1: Timeline Engine
4. Iterar y ajustar basado en feedback

---

**Estado**: ✅ Plan completado - Listo para comenzar implementación
