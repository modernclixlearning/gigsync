# 📋 Estado de Features: GigSync

**Última actualización**: 16 de Febrero, 2026  
**Rama actual**: `feature/smart-autoscroll`

---

## 📊 Resumen Ejecutivo

Este documento consolida todas las features implementadas y pendientes de GigSync, extraídas de la documentación actual del proyecto.

**Estado general**:
- ✅ **Features MVP**: Completas y funcionales
- ⚠️ **Smart Autoscroll**: Implementado, con settings avanzados y debug mode; faltan solo mejoras V2
- 📋 **Features V2**: Planificadas, pendientes de implementación
- 🔧 **Mejoras pendientes**: Varias áreas identificadas

---

## ✅ Features Implementadas (MVP)

### 1. Gestión de Canciones ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ CRUD completo de canciones
- ✅ Formato ChordPro soportado
- ✅ Parser robusto de ChordPro
- ✅ Almacenamiento en IndexedDB
- ✅ Búsqueda y filtrado
- ✅ Transposición de tonalidad en tiempo real
- ✅ Zoom de texto (100-200%)
- ✅ Secciones instrumentales con barras de acordes
- ✅ Marcadores de sección (Intro, Verso, Estribillo, etc.)

**Archivos principales**:
- `app/routes/songs.tsx`
- `app/lib/chordpro/parser.ts`
- `app/hooks/useSongs.ts`

---

### 2. Reproductor de Canciones ✅

**Estado**: Completo con Smart Autoscroll implementado

**Funcionalidades**:
- ✅ Visualización de letras con acordes posicionados (ChordPro rendering)
- ✅ Smart autoscroll sincronizado con BPM via timeline engine
- ✅ Transposición de tonalidad en tiempo real
- ✅ Zoom de texto (100-200%)
- ✅ Secciones instrumentales con barras de acordes
- ✅ Marcadores de sección
- ✅ Highlight visual de línea actual
- ✅ VisualBeat indicator en header

**Smart Autoscroll - Componentes implementados**:
- ✅ `useSongTimeline` - Timeline Engine (Fase 1)
- ✅ `useBPMSync` - BPM Sync Engine (Fase 2)
- ✅ `useSmartAutoScroll` - Smart Autoscroll (Fase 3)
- ✅ Integración completa con Player (Fase 4)
- ⚠️ UI/UX Polish parcial (Fase 5)

**Archivos principales**:
- `app/routes/song.$songId.index.tsx`
- `app/components/player/LyricsDisplay.tsx`
- `app/components/player/ChordOverlay.tsx`
- `app/hooks/useSongTimeline.ts`
- `app/hooks/useBPMSync.ts`
- `app/hooks/useSmartAutoScroll.ts`
- `app/lib/timeline/calculator.ts`

---

### 3. Metrónomo ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ Control de BPM 20-300 con +/- y tap tempo
- ✅ Compases: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
- ✅ 5 sonidos de click (classic, woodblock, sticks, electronic, silent)
- ✅ Tap tempo con cálculo por promedio de intervalos
- ✅ Beat visual con acento en primer tiempo
- ✅ Subdivisiones opcionales
- ✅ Audio via Tone.js
- ✅ Sincronización con Smart Autoscroll

**Archivos principales**:
- `app/routes/metronome.tsx`
- `app/hooks/useMetronome.ts`
- `app/hooks/useMetronomeSound.ts`
- `app/components/metronome/VisualBeat.tsx`

---

### 4. Modo Performance ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ Tema extreme-dark (negro OLED #05060b)
- ✅ Tipografía ajustable (100-200%)
- ✅ Autoscroll configurable
- ✅ Toggle de acordes y metrónomo visual

**Archivos principales**:
- `app/routes/song.$songId.index.tsx`
- `app/hooks/useSettings.ts`

---

### 5. Afinador ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ Detección cromática con pitchfinder
- ✅ Dial cromático con 12 notas
- ✅ Aguja de cents (-50 a +50)
- ✅ Calibración A4 ajustable (420-460 Hz)
- ✅ 6 presets: Standard, Drop D, Half Step Down, Open G, Bass, Ukulele
- ✅ Manejo de permisos de micrófono

**Archivos principales**:
- `app/routes/tuner.tsx`
- `app/hooks/useTuner.ts`
- `app/components/tuner/PitchDisplay.tsx`

---

### 6. Setlists ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ CRUD de setlists con IndexedDB
- ✅ Duración total calculada
- ✅ Reordenar con drag & drop (@dnd-kit)
- ✅ Modo play secuencial

**Archivos principales**:
- `app/routes/setlists.tsx`
- `app/hooks/useSetlists.ts`

---

### 7. Perfil y Configuración ✅

**Estado**: Completo y funcional

**Funcionalidades**:
- ✅ Perfil de usuario con instrumento, banda, avatar
- ✅ Settings organizados por feature (metrónomo, tuner, performance, player)
- ✅ Persistencia en localStorage
- ✅ Defaults razonables para todos los settings

**Archivos principales**:
- `app/routes/profile.tsx`
- `app/hooks/useSettings.ts`
- `app/types/profile.ts`

---

## ⚠️ Smart Autoscroll - Estado Detallado

### Fases Completadas ✅

#### ✅ Fase 1: Timeline Engine (COMPLETO)
- ✅ `app/hooks/useSongTimeline.ts`
- ✅ `app/lib/timeline/calculator.ts`
- ✅ `app/types/timeline.ts`
- ✅ `app/lib/timeline/utils.ts`
- ✅ Cálculo de timeline musical desde lyrics ChordPro
- ✅ Soporte para diferentes tipos de elementos
- ✅ Cálculo de duración basado en beats y compases
- ✅ Heurística simple implementada (defaultBarsPerLine: 2)
- ✅ Soporte para custom durations (override manual)

#### ✅ Fase 2: BPM Sync Engine (COMPLETO)
- ✅ `app/hooks/useBPMSync.ts`
- ✅ Sincronización con Tone.js Transport
- ✅ Tracking de beats, bars y beatInBar
- ✅ Control de play/pause/reset/seek
- ✅ Callbacks para cambios de beat/bar
- ✅ Soporte para diferentes time signatures

#### ✅ Fase 3: Smart Autoscroll (COMPLETO)
- ✅ `app/hooks/useSmartAutoScroll.ts`
- ✅ Scroll sincronizado con BPM
- ✅ Context window configurable (posición por defecto en tercio superior del viewport)
- ✅ Smooth scroll con interpolación ease-out
- ✅ Medición automática de posiciones DOM
- ✅ Tracking de elemento actual

#### ✅ Fase 4: Integración con Player (COMPLETO)
- ✅ `app/routes/song.$songId.index.tsx`
- ✅ `app/components/player/LyricsDisplay.tsx`
- ✅ `app/components/player/ChordOverlay.tsx`
- ✅ Integración completa del hook useSmartAutoScroll
- ✅ Data attributes (`data-element-id`) en todos los elementos
- ✅ Highlight visual de línea actual
- ✅ Sincronización con metronome sound
- ✅ VisualBeat indicator en header

#### ✅ Fase 5: UI/UX Polish (COMPLETO)
- ✅ Highlight de línea actual con estilo dinámico
- ✅ VisualBeat indicator en header cuando está activo
- ✅ Integración con metronome sound
- ✅ Beat/Bar indicator en modo debug con overlay numérico (beat/bar) activable desde settings
- ✅ Settings expandidos para Smart Scroll (context window, smoothness) con UI dedicada y persistencia en localStorage, incluyendo checkbox para beat indicator (debug)

#### ✅ Fase 6: Testing (COMPLETO)
- ✅ Tests unitarios completos para `useSongTimeline`
- ✅ Tests unitarios completos para `useBPMSync`
- ✅ Tests unitarios completos para `useSmartAutoScroll`
- ✅ Tests para `calculator.ts`
- ✅ 352 tests pasando en total

#### ⚠️ Fase 7: Finalización (PARCIALMENTE COMPLETO)
- ✅ Tests unitarios completos
- ✅ Documentación de código (JSDoc completo)
- ✅ Error handling robusto
- ✅ Fallback a autoscroll simple si timeline falla (activado mediante `hasFallback` + `useAutoScroll`)
- ⚠️ Settings persistidos en localStorage/DB - **PARCIAL** (todas las preferencias de Smart Autoscroll y la mayoría de settings se guardan en localStorage; falta definir estrategia de persistencia en DB/nube)

---

## 📋 Features Pendientes - Smart Autoscroll V2

### 1. Beat/Bar Indicator (Debug Mode) ⚠️

**Prioridad**: Baja  
**Tiempo estimado**: 2 horas  
**Estado**: Parcialmente completo

**Descripción**:
- Overlay de debug con beat/bar actual implementado en el player
- Activar/desactivar desde settings de Smart Scroll (checkbox persistido en `settings.player`)
- Pendiente para V2: variantes de visualización más ricas (minimaps, más métricas, etc.)

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 159-161)
- `docs/autoscroll-implementation-plan.md` (líneas 769-779)

**Nota**: Ya existe `VisualBeat` en el header, pero falta el indicador completo con información numérica.

---

### 2. Settings Expandidos para Smart Scroll ✅

**Prioridad**: Baja  
**Tiempo estimado**: 3-4 horas  
**Estado**: Completado

**Descripción**:
- UI en `PlayerControls` para ajustar context window ratio (0-100%)
- UI para ajustar smoothness (0-100) mapeado a duración de scroll suave
- Persistencia en localStorage vía `useSettings.player`
- Checkbox para mostrar beat indicator (debug) integrado en el panel de Smart Scroll

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 163-166)
- `docs/autoscroll-implementation-plan.md` (líneas 781-808)

**Nota**: Actualmente los valores están hardcodeados en el componente.

---

### 3. Fallback a Autoscroll Simple ⚠️

**Prioridad**: Media  
**Tiempo estimado**: 2-3 horas  
**Estado**: Pendiente

**Descripción**:
- Detectar cuando timeline falla
- Cambiar automáticamente a autoscroll simple
- Notificar al usuario

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 168-171, 124)
- `docs/autoscroll-implementation-plan.md` (línea 854)
- `docs/autoscroll-executive-summary.md` (línea 97)

---

### 4. Manual Duration Adjustments UI ⚠️

**Prioridad**: Baja  
**Tiempo estimado**: 4-5 horas  
**Estado**: Pendiente

**Descripción**:
- Permitir ajustar duración de elementos desde UI
- Guardar ajustes por canción
- Override manual de duraciones calculadas

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 173-175)
- `docs/autoscroll-executive-summary.md` (línea 159)
- `docs/autoscroll-implementation-plan.md` (línea 861)

**Nota**: La infraestructura para custom durations ya existe en el código, falta la UI.

---

### 5. Features Opcionales V2 (Largo Plazo) 📋

**Prioridad**: Muy Baja  
**Estado**: Planificadas

**Features sugeridas**:
- 📊 **Song structure minimap**: Barra visual con estructura completa
- 🎯 **Navigation por secciones**: Tap en sección → jump directo
- 📤 **Export/import timing maps**: Compartir timing entre setlists
- 🎤 **Audio analysis**: Detectar BPM automáticamente desde audio
- 🎸 **MIDI sync**: Para backing tracks

**Ubicación en documentación**:
- `docs/autoscroll-executive-summary.md` (líneas 153-161)
- `docs/autoscroll-implementation-plan.md` (líneas 857-863)
- `docs/autoscroll-README.md` (líneas 254-263)

---

## 🔧 Mejoras Pendientes - Otras Features

### 1. Setlist Management Mejoras ⚠️

**Prioridad**: Media  
**Estado**: Pendiente

**Mejoras sugeridas**:
- Eliminar canción de DB debería actualizarse en setlists (TODO mencionado)
- Mejorar modo play de setlist

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 186-188)

---

### 2. Profile/Settings Mejoras ⚠️

**Prioridad**: Media  
**Estado**: Pendiente

**Mejoras sugeridas**:
- Stats calculadas desde IndexedDB (actualmente hardcodeadas)
- Exportar datos como JSON (TODO mencionado)

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 190-192)
- `docs/app-idea.md` (líneas 250, 256)

---

### 3. Validación ⚠️

**Prioridad**: Media  
**Estado**: Pendiente

**Mejoras sugeridas**:
- Agregar validación zod en forms (TODO mencionado)

**Ubicación en documentación**:
- `docs/estado-actual-app.md` (líneas 194-195)

---

## 🚀 Roadmap Post-MVP

### Versión 1.1 📋

**Estado**: Planificada

**Features**:
- Editor visual de canciones con preview
- Diagramas de acordes
- Exportar a PDF
- Estadísticas reales desde IndexedDB (actualmente hardcoded)

**Ubicación en documentación**:
- `docs/app-idea.md` (líneas 246-250)

---

### Versión 1.2 📋

**Estado**: Planificada

**Features**:
- Sync en la nube (backend, hook placeholder existe)
- Compartir canciones entre dispositivos
- Colaboración con banda
- Exportar/importar datos JSON

**Ubicación en documentación**:
- `docs/app-idea.md` (líneas 252-256)

---

### Versión 2.0 📋

**Estado**: Planificada

**Features**:
- Grabación de sesiones
- Loops de sección para práctica
- Tracking de progreso
- CI/CD pipeline

**Ubicación en documentación**:
- `docs/app-idea.md` (líneas 258-262)

---

## 📊 Métricas de Éxito Actuales

### Funcionalidad ✅
- ✅ Timeline se genera correctamente
- ✅ Sincronización BPM funciona
- ✅ Cambios de sección sincronizados
- ✅ Scroll suave implementado

### UX ✅
- ✅ Context window mantiene visibilidad
- ✅ Transiciones suaves
- ✅ Highlight visual de línea actual
- ✅ VisualBeat indicator

### Performance ⚠️
- ⚠️ No hay métricas de performance documentadas
- ⚠️ No hay tests de performance
- ⚠️ Necesita validación con canciones reales

### Testing ✅
- ✅ 352 tests pasando
- ✅ Tests unitarios completos para hooks principales
- ✅ Cobertura de tests para timeline calculator

---

## 📝 Notas Adicionales

### Compatibilidad
- ✅ Funciona con formato ChordPro existente
- ✅ Compatible con todas las secciones soportadas
- ✅ Soporta diferentes time signatures
- ✅ Funciona con/sin BPM definido (usa default 120)

### Dependencias
- ✅ Tone.js ya estaba en el proyecto
- ✅ No requiere nuevas dependencias
- ✅ Compatible con navegadores modernos

### Estado del Branch
- Branch: `feature/smart-autoscroll`
- Archivos modificados: 10+
- Archivos nuevos: 5+
- Documentación: Completa en `/docs/autoscroll-*.md`

---

## 🔗 Referencias de Documentación

### Documentos Principales
1. **`docs/estado-actual-app.md`** - Análisis completo del estado actual
2. **`docs/autoscroll-executive-summary.md`** - Resumen ejecutivo de Smart Autoscroll
3. **`docs/autoscroll-implementation-plan.md`** - Plan detallado de implementación
4. **`docs/autoscroll-README.md`** - Índice de documentación de autoscroll
5. **`docs/app-idea.md`** - Visión general del producto y roadmap

### Documentos de Soporte
- `docs/autoscroll-analysis.md` - Análisis técnico completo
- `docs/autoscroll-duration-examples.md` - Ejemplos de cálculo de duración
- `docs/profile-and-settings.md` - Documentación de perfil y settings

---

**Última actualización**: 16 de Febrero, 2026  
**Próxima revisión**: Después de completar features V2 o mejoras pendientes
