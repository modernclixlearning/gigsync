# 📋 Resumen Ejecutivo: Smart Autoscroll

## TL;DR

Transformar el autoscroll actual (velocidad constante) en un **autoscroll inteligente** que sigue la estructura musical de la canción compás por compás, sincronizado con el BPM.

---

## ❌ Problema Actual

El autoscroll de GigSync:
- Usa velocidad arbitraria (pixels/frame)
- No conoce la estructura de la canción
- No está sincronizado con el BPM
- Es lineal y constante (no considera duración real de secciones)

**Resultado**: Experiencia desconectada de la música real

---

## ✅ Solución Propuesta

### Sistema de 3 Capas:

```
1️⃣ Timeline Engine
    ↓ Analiza estructura musical
2️⃣ BPM Sync Engine  
    ↓ Mantiene tiempo musical actual
3️⃣ Smart Autoscroll
    ↓ Scroll con contexto visual
```

### Características Clave:

- **Sincronizado con BPM**: El scroll sigue los beats de la canción
- **Consciente de estructura**: Conoce secciones, compases, acordes
- **Context window**: Siempre ves de dónde vienes y hacia dónde vas
- **Smooth interpolation**: Transiciones suaves, no saltos bruscos
- **Configurable**: Ajustar contexto, smoothness, etc.

---

## 🎯 Lo Bueno del Código Actual

| ✅ Ya existe | 🎉 Se puede reutilizar |
|-------------|----------------------|
| Parser ChordPro robusto | 100% - Es la base del timeline |
| Sistema de metrónomo con Tone.js | 90% - Lógica de BPM sync |
| Estructura de componentes | 80% - Solo agregar nuevos hooks |
| State management | 100% - React Query funciona |

**Conclusión**: Tenemos las piezas fundamentales, solo necesitamos orquestarlas.

---

## 🔧 Componentes Nuevos a Crear

### 1. `useSongTimeline()` Hook
- **Qué hace**: Convierte lyrics en timeline musical
- **Input**: Letra ChordPro, BPM, Time Signature
- **Output**: Array de `TimelineElement` con duración en beats

### 2. `useBPMSync()` Hook  
- **Qué hace**: Mantiene tiempo musical actual (beats, bars)
- **Input**: BPM, Time Signature
- **Output**: `currentBeat`, `currentBar`, play/pause/seek
- **Base**: Reutiliza código de `useMetronome`

### 3. `useSmartAutoScroll()` Hook
- **Qué hace**: Scroll inteligente basado en beat actual
- **Input**: Timeline, currentBeat, containerRef
- **Output**: Scroll automático suave con contexto
- **Reemplaza**: `useAutoScroll` actual

---

## 📐 Cómo Calcula Duración

### Prioridad de Cálculo:

1. **Duración explícita** (más confiable)
   ```chordpro
   [Intro | 4 bars]  → 4 compases exactos ✅
   ```

2. **Chord bars con separadores**
   ```chordpro
   Am | G | C | F |  → 4 compases (1 por acorde) ✅
   ```

3. **Heurística inteligente** (lines lyrics)
   ```chordpro
   [Am]Letra con [G]dos acordes  → 2 compases (1 por acorde)
   ```

4. **Default fijo** (fallback)
   ```
   Línea sin acordes → 2 compases por defecto
   ```

### Ejemplo Real:

```chordpro
{tempo: 120}
{time: 4/4}

[Intro | 4 bars]              → 16 beats (4 bars × 4 beats)
Am | G | C | F |              → 16 beats

[Verse]                       → 0 beats (header)
[Am]Primera línea [G]aquí     → 8 beats (2 bars)
[C]Segunda línea [F]también   → 8 beats (2 bars)

TOTAL: 48 beats = 12 compases = 24 segundos @ 120 BPM
```

---

## 🖼️ Context Window Explicado

```
┌────────────────────────────────┐
│ [Verse]                        │ ← Contexto (dimmed)
│ Línea anterior...              │
├────────────────────────────────┤
│ ▶️ [Am] LÍNEA ACTUAL [G] ◀️    │ ← Resaltada, posición óptima
├────────────────────────────────┤
│ Próxima línea...               │ ← Look-ahead
│ [Chorus]                       │
└────────────────────────────────┘
```

**Clave**: La línea actual NO está en el centro, sino en el tercio superior del viewport, permitiendo ver más "hacia adelante" (como leer un libro).

---

## ⏱️ Timeline Estimado

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 1 | Timeline Engine (core) | 3-4h |
| 2 | BPM Sync Engine | 2-3h |
| 3 | Smart Autoscroll | 3-4h |
| 4 | Integración con Player | 2-3h |
| 5 | UI/UX Polish | 2-3h |
| 6 | Testing & Refinamiento | 3-4h |
| 7 | Finalización | 2h |
| **TOTAL** | **MVP completo** | **18-25h** |

---

## 🎨 Features Opcionales (V2)

Ideas para después del MVP:

- 📊 **Song structure minimap**: Barra visual con estructura completa
- 🎯 **Navigation por secciones**: Tap en sección → jump directo
- ⚙️ **Manual duration adjustments**: Override UI para ajustar timing
- 📤 **Export/import timing maps**: Compartir timing entre setlists
- 🎤 **Audio analysis**: Detectar BPM automáticamente desde audio

---

## 🚦 Decisiones a Tomar

Antes de comenzar implementación:

### 1. ¿Qué heurística usar para líneas de letra?

**Opción A - Simple** (recomendado para MVP):
- Default fijo: 2 compases por línea
- Fácil de implementar y predecible

**Opción B - Inteligente**:
- Analizar densidad de acordes
- Considerar longitud de texto
- Más preciso pero más complejo

**Recomendación**: Empezar con A, agregar B después

### 2. ¿Permitir override manual desde el inicio?

**Recomendación**: SÍ
- Crear infraestructura desde inicio
- UI puede esperar a V2
- Permite ajustes precisos por canción

### 3. ¿Modo debug visible?

**Recomendación**: SÍ
- Beat/Bar indicator en esquina
- Activar con setting
- Invaluable para testing

---

## ✅ Criterios de Éxito

### Funcional:
- [ ] Timeline se genera correctamente
- [ ] Sincronización BPM ±50ms de precisión
- [ ] Cambios de sección exactos

### UX:
- [ ] Context window mantiene 2+ líneas visibles arriba/abajo
- [ ] Transiciones suaves (no saltos)
- [ ] Usuario puede anticipar scroll

### Performance:
- [ ] 60fps constante
- [ ] Sin lag al cambiar de sección
- [ ] Memoria estable (no memory leaks)

---

## 🔍 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Estimación de duración inexacta | Alta | Permitir override manual + calibración |
| Performance issues con scroll | Media | Throttling, memoización, virtualization |
| Tone.js conflictos con metrónomo | Baja | Compartir Transport instance |
| UX confusa para usuarios | Media | Tutorial, settings claras, fallback a simple |

---

## 🎯 Próximos Pasos

### Paso 1: Validación
- [ ] Revisar este análisis completo
- [ ] Confirmar enfoque de 3 capas
- [ ] Decidir sobre heurísticas (simple vs inteligente)
- [ ] Confirmar timeline de 18-25h es aceptable

### Paso 2: Setup
- [ ] Crear branch `feature/smart-autoscroll`
- [ ] Crear estructura de archivos
- [ ] Configurar tests

### Paso 3: Implementación
- [ ] Comenzar con Fase 1 (Timeline Engine)
- [ ] Iterar fase por fase
- [ ] Testing continuo con canciones reales

---

## 📚 Documentos de Referencia

1. **`autoscroll-analysis.md`**: Análisis completo del código actual
2. **`autoscroll-duration-examples.md`**: Ejemplos de cálculo de duración
3. **`autoscroll-implementation-plan.md`**: Plan detallado paso a paso (este documento es el resumen)

---

## 🙋 Preguntas Frecuentes

### ¿Por qué no usar la implementación simple del autoscroll actual?
Porque no está sincronizada con la música. Para músicos profesionales, el timing debe ser preciso.

### ¿Funcionará con canciones sin BPM definido?
Sí, usaremos default (120 BPM). Usuario puede ajustar.

### ¿Qué pasa si el usuario edita la canción mientras reproduce?
El timeline se recalcula automáticamente (useEffect en useSongTimeline).

### ¿Es compatible con el formato ChordPro existente?
100% compatible. Usamos el parser existente.

### ¿Qué navegadores/dispositivos soporta?
Todos los que soportan Tone.js (Chrome, Firefox, Safari, Edge moderno).

---

## 💬 Feedback Esperado

Por favor confirmar:

1. ✅ ¿El enfoque de 3 capas tiene sentido?
2. ✅ ¿Reutilizar código del metrónomo es buena idea?
3. ✅ ¿El timeline de 18-25h es realista?
4. ✅ ¿Empezamos con heurística simple o inteligente?
5. ✅ ¿Alguna preocupación o sugerencia?

---

**Estado**: 📝 Análisis completo - Esperando validación para comenzar implementación

**Fecha**: Febrero 9, 2026  
**Versión**: 1.0
