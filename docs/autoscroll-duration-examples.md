# Ejemplos de Cálculo de Duración para Smart Autoscroll

Este documento complementa el análisis principal con ejemplos concretos de cómo se calcularían las duraciones de elementos musicales.

---

## 🎵 Ejemplo 1: Canción Simple

### Input (ChordPro):
```chordpro
{title: Mi Canción}
{artist: Artista}
{tempo: 120}
{time: 4/4}

[Intro | 4 bars]
Am | G | C | F |

[Verse]
[Am]Esta es la primera [G]línea del verso
[C]Esta es la segunda [F]línea también

[Chorus]
[Am]Coro coro [G]coro
[C]Canta fuerte [F]ya
```

### Timeline Calculado:

**BPM: 120** → 1 beat = 0.5 segundos  
**Time Signature: 4/4** → 4 beats por compás

| ID | Tipo | Contenido | Beats | Compases | Start Beat | End Beat | Duración (seg) |
|----|------|-----------|-------|----------|------------|----------|----------------|
| 1 | section | [Intro] | 0 | 0 | 0 | 0 | 0 |
| 2 | instrumental | Am \| G \| C \| F \| | 16 | 4 | 0 | 16 | 8s |
| 3 | section | [Verse] | 0 | 0 | 16 | 16 | 0 |
| 4 | lyric | [Am]Esta es... [G]línea | 8 | 2 | 16 | 24 | 4s |
| 5 | lyric | [C]Esta es... [F]también | 8 | 2 | 24 | 32 | 4s |
| 6 | section | [Chorus] | 0 | 0 | 32 | 32 | 0 |
| 7 | lyric | [Am]Coro [G]coro | 8 | 2 | 32 | 40 | 4s |
| 8 | lyric | [C]Canta [F]ya | 8 | 2 | 40 | 48 | 4s |

**Duración total**: 48 beats = 12 compases = 24 segundos

### Lógica de Cálculo:

1. **[Intro | 4 bars]**: Explícito → 4 compases × 4 beats = 16 beats ✅
2. **Am | G | C | F |**: 4 acordes separados por `|` → 4 compases × 4 beats = 16 beats ✅
3. **Líneas de letra con 2 acordes**: Default → 2 compases × 4 beats = 8 beats
   - Heurística: 1 compás por acorde (configurable)

---

## 🎸 Ejemplo 2: Canción con Diferentes Time Signatures

### Input (ChordPro):
```chordpro
{title: Canción Compleja}
{tempo: 90}
{time: 3/4}  # ← Vals: 3 beats por compás

[Intro | 8 bars]
Am | Em | Am | Em |
Dm | G | C | Am |

[Verse]
[Am]Esta línea tiene [Em]dos acordes
[Dm]Y esta también [G]dos acordes
```

### Timeline Calculado:

**BPM: 90** → 1 beat = 0.67 segundos  
**Time Signature: 3/4** → 3 beats por compás

| ID | Tipo | Contenido | Beats | Compases | Start Beat | End Beat | Duración (seg) |
|----|------|-----------|-------|----------|------------|----------|----------------|
| 1 | section | [Intro] | 0 | 0 | 0 | 0 | 0 |
| 2 | instrumental | 8 líneas de acordes | 24 | 8 | 0 | 24 | 16s |
| 3 | section | [Verse] | 0 | 0 | 24 | 24 | 0 |
| 4 | lyric | [Am]Esta... [Em]acordes | 6 | 2 | 24 | 30 | 4s |
| 5 | lyric | [Dm]Y esta... [G]acordes | 6 | 2 | 30 | 36 | 4s |

**Duración total**: 36 beats = 12 compases = 24 segundos

### Notas:
- En 3/4, cada compás tiene 3 beats (no 4)
- Líneas con 2 acordes → 2 compases × 3 beats = 6 beats

---

## 🎹 Ejemplo 3: Sección Instrumental Compleja

### Input (ChordPro):
```chordpro
{tempo: 140}
{time: 4/4}

[Solo - Guitar | 16 bars]
Am7 | Am7 | G | G |
F | F | E7 | E7 |
Am7 | Am7 | G | G |
F | F | E7 | Am7 |

[Breakdown]
Am
```

### Timeline Calculado:

**BPM: 140** → 1 beat = 0.43 segundos

| ID | Tipo | Contenido | Beats | Compases | Start Beat | End Beat |
|----|------|-----------|-------|----------|------------|----------|
| 1 | section | [Solo - Guitar] | 0 | 0 | 0 | 0 |
| 2 | instrumental | 16 compases explícitos | 64 | 16 | 0 | 64 |
| 3 | section | [Breakdown] | 0 | 0 | 64 | 64 |
| 4 | chords-only | Am | 4 | 1 | 64 | 68 |

**Duración total**: 68 beats = 17 compases = 29.1 segundos

### Notas:
- `[Solo - Guitar | 16 bars]`: Duración EXPLÍCITA → 16 compases
- Las líneas de acordes subsecuentes confirman la estructura
- `Am` (un solo acorde sin `|`) → 1 compás por default

---

## 🎤 Ejemplo 4: Letra Densa vs. Espaciada

### Input A - Letra Densa:
```chordpro
{tempo: 120}
[Verse]
[C]Cuan[G]do lle[Am]gues tú ve[F]rás que to[C]do es[G]tá bien
```

**Análisis**: 6 acordes en una línea → Probablemente 4-6 compases

| Tipo | Acordes | Estimación | Beats |
|------|---------|------------|-------|
| lyric | 6 | 1.5 acordes/compás → 4 compases | 16 |

### Input B - Letra Espaciada:
```chordpro
{tempo: 120}
[Verse]
[C]Cuando llegues tú
```

**Análisis**: 1 acorde, letra larga → Probablemente 2+ compases

| Tipo | Acordes | Estimación | Beats |
|------|---------|------------|-------|
| lyric | 1 | 2 compases por default | 8 |

### Heurística Inteligente:

```typescript
function estimateLineDuration(line: LyricParsedLine, timeSignature: string): number {
  const beatsPerBar = parseInt(timeSignature.split('/')[0])
  const chordCount = line.chords.length
  const textLength = line.text.length
  
  // Caso 1: Muchos acordes (densidad alta)
  if (chordCount >= 4) {
    // 1 compás por cada 1.5 acordes
    return Math.ceil(chordCount / 1.5) * beatsPerBar
  }
  
  // Caso 2: Pocos acordes, texto largo
  if (chordCount <= 2 && textLength > 40) {
    // Mínimo 2 compases para líneas largas
    return 2 * beatsPerBar
  }
  
  // Caso 3: Default
  return Math.max(chordCount, 2) * beatsPerBar
}
```

---

## 🔄 Ejemplo 5: Repeticiones

### Input (ChordPro):
```chordpro
[Chorus]
[C]Coro coro [G]coro
[Am]Canta fuerte [F]ya

[Chorus x2]  # ← Repetir 2 veces
```

### Timeline Calculado:

**Opción A - Expandir repeticiones:**

| ID | Tipo | Contenido | Beats | Start | End |
|----|------|-----------|-------|-------|-----|
| 1 | section | [Chorus] | 0 | 0 | 0 |
| 2 | lyric | [C]Coro... [G]coro | 8 | 0 | 8 |
| 3 | lyric | [Am]Canta... [F]ya | 8 | 8 | 16 |
| 4 | section | [Chorus x2] | 0 | 16 | 16 |
| 5 | lyric-repeat | [C]Coro... [G]coro | 8 | 16 | 24 |
| 6 | lyric-repeat | [Am]Canta... [F]ya | 8 | 24 | 32 |

**Opción B - Metadata de repetición:**

| ID | Tipo | Repeat | Beats Total |
|----|------|--------|-------------|
| 1 | chorus-block | x2 | 32 (16×2) |

**Implementación preferida**: Opción A (más explícito para scroll)

---

## 📐 Ejemplo 6: Calibración Manual

### Problema:
Usuario reporta que una sección va muy rápido/lento.

### Solución - Override Manual:

```typescript
interface ManualTimingOverride {
  songId: string
  elementId: string  // ID único del elemento en timeline
  customDuration: number  // En beats
  reason?: string  // "El guitarrista hace un solo más largo aquí"
}

// Persistir en DB
const overrides: ManualTimingOverride[] = [
  {
    songId: 'song-123',
    elementId: 'intro-instrumental',
    customDuration: 24,  // En lugar de 16 calculado
    reason: 'Intro extendido en vivo'
  }
]
```

### UI para ajuste:

```
┌─────────────────────────────────┐
│ [Intro | 4 bars]                │
│                                 │
│ ⏱️ Duración: [16] beats         │
│                                 │
│ ⚙️ Ajustar manualmente          │
│   [−] [  20  ] [+] beats       │
│                                 │
│ 💡 Razón: Intro más largo      │
└─────────────────────────────────┘
```

---

## 🧪 Validación con Canciones Reales

### Test Suite Sugerida:

1. **Balada lenta** (60-80 BPM, 4/4)
2. **Rock estándar** (120-140 BPM, 4/4)
3. **Vals** (90-120 BPM, 3/4)
4. **Canción compleja** (cambios de tempo, time signatures)
5. **Solo instrumental largo** (16+ compases)

### Métricas de Éxito:

- ✅ Timeline total ±10% de duración real
- ✅ Cambios de sección sincronizados ±1 compás
- ✅ Sin "saltos" visuales bruscos
- ✅ Context window siempre visible

---

## 🚀 Roadmap de Precisión

### MVP (Fase 1):
- ✅ Duraciones explícitas (secciones con `| X bars`)
- ✅ Default: 2 compases por línea de letra
- ✅ Default: 1 compás por acorde en líneas chord-only

### Mejora 1 (Fase 2):
- ✅ Heurística de densidad de acordes
- ✅ Considerar longitud de texto
- ✅ Override manual por sección

### Mejora 2 (Fase 3):
- ✅ Machine learning: Analizar patterns de canciones similares
- ✅ Ajuste automático basado en feedback del usuario
- ✅ Import timing data desde MIDI / backing tracks

### Mejora 3 (Fase 4):
- ✅ Audio analysis: Detectar BPM y estructura desde audio
- ✅ Sync con backing tracks reales
- ✅ Community timing database

---

## 💡 Tips de Implementación

### 1. Start Simple:
```typescript
// MVP: Todo es 2 compases
const defaultBarsPerLine = 2
const beatsPerLine = defaultBarsPerLine * beatsPerBar
```

### 2. Add Intelligence:
```typescript
// Considerar acordes
const bars = line.chords.length > 0 
  ? Math.max(line.chords.length, 2) 
  : 2
```

### 3. Add Overrides:
```typescript
// Permitir custom timing
const bars = overrides[elementId]?.customDuration 
  ?? calculateDefaultDuration(element)
```

### 4. Make it Visual:
```typescript
// Debug mode: Mostrar beats en cada línea
if (DEBUG_MODE) {
  console.log(`Element ${id}: ${beats} beats (${bars} bars)`)
}
```

---

## 🎯 Resumen

### Prioridades de Cálculo:

1. **Más confiable** → **Menos confiable**:
   - Duración explícita: `[Intro | 4 bars]` ✅✅✅
   - Chord bars con `|`: `Am | G | C |` ✅✅
   - Conteo de acordes + heurística ✅
   - Default fijo (2 compases) ⚠️

2. **Performance**:
   - Calcular timeline una vez al cargar canción
   - Cachear resultados
   - Recalcular solo si cambia lyrics

3. **User Experience**:
   - Siempre permitir override manual
   - Guardar ajustes personalizados
   - Export/import timing maps para setlists compartidas

---

**Próximo paso**: Implementar `useSongTimeline()` hook con estos ejemplos como test cases.
