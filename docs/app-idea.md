Perfecto, vamos a pasar en limpio **GigSync** con decisiones concretas.

## GigSync - Definición del Proyecto

### Stack Tecnológico Final

**Framework & Runtime:**
- **TanStack Start** - Full-stack TypeScript con SSR
- **TanStack Router** - Routing type-safe
- **TanStack Query** - Gestión de estado servidor/cliente

**Audio:**
- **Tone.js** - Metronomo y síntesis de audio
- **Web Audio API** - Detección de pitch para afinador
- **pitchfinder** - Algoritmos de detección de frecuencia

**Base de Datos (Offline-First):**
- **IndexedDB** - Storage local del navegador
- **Dexie.js** - Wrapper TypeScript para IndexedDB con queries más fáciles
- **Sync opcional** - API para backup en la nube cuando haya conexión

**UI:**
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes base
- **Framer Motion** - Animaciones del metronomo visual

**PWA:**
- **Workbox** - Service worker para funcionamiento offline completo
- **vite-plugin-pwa** - Configuración de manifest y assets

### Arquitectura de Datos Offline

```typescript
// Schema IndexedDB
interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  timeSignature: string;
  duration: number; // segundos
  lyrics: string; // con acordes embebidos
  tags: string[];
  lastPlayed?: Date;
  timesPlayed: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  totalDuration: number;
  venue?: string;
  date?: Date;
  createdAt: Date;
}

interface UserSettings {
  id: 'settings';
  defaultBpm: number;
  metronomeSound: string;
  tunerCalibration: number; // A4 Hz
  performanceMode: {
    fontSize: number;
    theme: 'dark' | 'extreme-dark';
    scrollSpeed: number;
  };
}
```

### Estructura del Proyecto

```
gigsync/
├── app/
│   ├── routes/
│   │   ├── index.tsx              # Dashboard/Biblioteca
│   │   ├── song.$id.tsx           # Reproductor de canción
│   │   ├── song.$id.edit.tsx      # Editor
│   │   ├── metronome.tsx          # Configurador metronomo
│   │   ├── tuner.tsx              # Afinador
│   │   ├── performance.tsx        # Modo escenario
│   │   └── setlists/
│   │       ├── index.tsx          # Lista de setlists
│   │       └── $id.tsx            # Setlist específico
│   ├── components/
│   │   ├── library/
│   │   │   ├── SongCard.tsx
│   │   │   ├── SongFilters.tsx
│   │   │   └── SongSearch.tsx
│   │   ├── player/
│   │   │   ├── LyricsDisplay.tsx
│   │   │   ├── ChordOverlay.tsx
│   │   │   ├── AutoScroll.tsx
│   │   │   └── PlayerControls.tsx
│   │   ├── metronome/
│   │   │   ├── BpmDial.tsx
│   │   │   ├── TimeSignature.tsx
│   │   │   ├── VisualBeat.tsx
│   │   │   └── TapTempo.tsx
│   │   ├── tuner/
│   │   │   ├── PitchDetector.tsx
│   │   │   ├── ChromaticDial.tsx
│   │   │   └── TuningPresets.tsx
│   │   └── ui/
│   │       └── ... (shadcn components)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── queries.ts
│   │   │   └── sync.ts
│   │   ├── audio/
│   │   │   ├── metronome.ts       # Tone.js wrapper
│   │   │   ├── tuner.ts           # Web Audio API
│   │   │   └── sounds.ts
│   │   └── utils/
│   │       ├── chord-parser.ts
│   │       ├── transpose.ts
│   │       └── scroll-sync.ts
│   └── hooks/
│       ├── useMetronome.ts
│       ├── useTuner.ts
│       ├── useSongLibrary.ts
│       └── useOfflineSync.ts
├── public/
│   ├── sounds/                    # Samples metronomo
│   └── manifest.json              # PWA manifest
└── package.json
```

### Funcionalidades Core - Versión 1.0

**1. Biblioteca de Canciones** ✓ Offline
- CRUD completo de canciones
- Búsqueda y filtros (título, artista, BPM, tonalidad, tags)
- Importar desde texto plano con formato ChordPro
- Estadísticas: veces tocada, última fecha
- Tags personalizados

**2. Reproductor** ✓ Offline
- Letras con acordes posicionados sobre sílabas
- Scroll automático sincronizado con BPM
- Transposición de tonalidad en tiempo real
- Zoom de texto
- Metrónomo visual discreto en header
- Marcadores de sección (Intro, Verso, Estribillo)

**3. Metronomo** ✓ Offline
- Control de BPM 30-300 con dial táctil
- Compases: 4/4, 3/4, 6/8, 5/4 + personalizados
- 5 sonidos de click (clásico, woodblock, sticks, electronic, silent)
- Tap tempo
- Metrónomo visual con flash en downbeat
- Subdivisiones opcionales

**4. Modo Performance** ✓ Offline
- Tema oscuro extremo (negro + texto rojo)
- Tipografía XL (hasta 200%)
- Controles gestuales: swipe (canción), pinch (zoom), tap (play/pause)
- Auto-avance en setlists
- Metrónomo visual prominente

**5. Afinador** ✓ Offline
- Precisión ±0.5 cents
- Dial cromático con las 12 notas
- Detección automática de nota + Hz
- Calibración A4 ajustable (430-450 Hz)
- Presets: Standard, Drop D, DADGAD, Open G

**6. Setlists** ✓ Offline
- Crear listas de canciones para shows
- Duración total calculada
- Reordenar con drag & drop
- Modo performance dedicado para setlists

### Roadmap Post-MVP

**Versión 1.1:**
- Editor visual de canciones con preview
- Diagramas de acordes
- Exportar a PDF

**Versión 1.2:**
- Sync en la nube (backup opcional)
- Compartir canciones entre dispositivos
- Colaboración con banda

**Versión 2.0:**
- Grabación de sesiones
- Loops de sección para práctica
- Tracking de progreso