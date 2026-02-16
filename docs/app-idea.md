## GigSync - Definicion del Proyecto

### Stack Tecnologico

**Framework & Runtime:**
- **TanStack Start v1.157** - Full-stack TypeScript con SSR
- **TanStack Router v1.157** - Routing type-safe con file-based routes
- **TanStack React Query v5** - Gestion de estado servidor/cliente con caching
- **React 19** - UI framework
- **Vite 7.3** - Build tool y dev server
- **Nitro** - Server framework integration

**Audio:**
- **Tone.js v15** - Metronomo y sintesis de audio
- **Web Audio API** - Deteccion de pitch para afinador
- **pitchfinder v2.3** - Algoritmos de deteccion de frecuencia

**Base de Datos (Offline-First):**
- **IndexedDB** - Storage local del navegador
- **Dexie.js v4** - Wrapper TypeScript para IndexedDB
- **dexie-react-hooks** - Hooks reactivos para queries
- **Sync opcional** - TODO: API para backup en la nube

**UI:**
- **Tailwind CSS v4** - Styling con @theme y CSS custom properties
- **class-variance-authority** - Variantes de componentes
- **clsx + tailwind-merge** - Class merging via cn() helper
- **Framer Motion** - Animaciones
- **Lucide React** - Iconografia
- **@dnd-kit** - Drag and drop para setlists

**Validacion:**
- **Zod** - Schema validation y runtime type checking

**Testing:**
- **Vitest** - Test runner con jsdom
- **Testing Library** - React component testing
- **v8** - Coverage provider

**PWA:**
- Manifest configurado para standalone
- Offline-first con IndexedDB

### Arquitectura de Datos

```typescript
// Database: Dexie (IndexedDB) - app/lib/db.ts
// Tablas: songs, setlists

interface Song {
  id: string          // UUID v4
  title: string
  artist: string
  bpm: number
  key: string
  timeSignature: string
  duration: number    // segundos
  lyrics: string      // formato ChordPro
  tags: string[]
  lastPlayed?: Date
  timesPlayed: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface Setlist {
  id: string
  name: string
  songIds: string[]
  totalDuration: number
  venue?: string
  date?: Date
  createdAt: Date
}

// Profile y Settings almacenados en localStorage
// Ver: app/types/profile.ts
```

### Estructura del Proyecto

```
gigsync/
├── app/
│   ├── routes/                     # TanStack Router file-based routes
│   │   ├── __root.tsx              # Root layout (HTML shell, fonts, meta)
│   │   ├── index.tsx               # Biblioteca de canciones (home)
│   │   ├── song.$songId.tsx        # Layout wrapper de cancion
│   │   ├── song.$songId.index.tsx  # Player de cancion
│   │   ├── song.$songId.edit.tsx   # Editor de cancion
│   │   ├── songs.new.tsx           # Crear cancion nueva
│   │   ├── metronome.tsx           # Metronomo
│   │   ├── tuner.tsx               # Afinador
│   │   ├── setlists/
│   │   │   ├── index.tsx           # Lista de setlists
│   │   │   └── $setlistId.tsx      # Detalle de setlist
│   │   │   └── $setlistId/
│   │   │       └── play.tsx        # Modo presentacion
│   │   └── profile/
│   │       ├── index.tsx           # Vista del perfil
│   │       └── settings.tsx        # Configuracion de la app
│   ├── components/                 # Componentes React por feature
│   │   ├── library/                # SongCard, SongFilters, SongSearch
│   │   ├── player/                 # LyricsDisplay, ChordOverlay, PlayerControls, AutoScroll
│   │   ├── metronome/              # BPMControl, VisualBeat, TapTempo, SoundSelector
│   │   ├── tuner/                  # ChromaticDial, TunerNeedle, PitchDisplay, TuningPresets
│   │   ├── setlists/               # SetlistCard, SetlistForm, SongItem (draggable)
│   │   ├── songs/                  # SongForm, ChordProImporter
│   │   ├── navigation/             # BottomNav, NavItem
│   │   └── profile/                # ProfileForm, Settings components
│   ├── hooks/                      # Custom React hooks
│   │   ├── useMetronome.ts         # Tone.js metronome engine
│   │   ├── useTapTempo.ts          # BPM from tap intervals
│   │   ├── useTuner.ts             # Pitch detection engine
│   │   ├── useMicrophone.ts        # Microphone permissions
│   │   ├── useSongLibrary.ts       # Song CRUD + filtering
│   │   ├── useSong.ts              # Single song operations
│   │   ├── useSongPlayer.ts        # Player state management
│   │   ├── useSmartAutoScroll.ts   # BPM-synced autoscroll
│   │   ├── useSongTimeline.ts      # Timeline calculation
│   │   ├── useBPMSync.ts           # BPM synchronization
│   │   ├── useSetlists.ts          # Setlist listing
│   │   ├── useSetlist.ts           # Single setlist CRUD
│   │   ├── useProfile.ts           # Profile (localStorage)
│   │   ├── useSettings.ts          # Settings (localStorage)
│   │   ├── useStats.ts             # User statistics (TODO)
│   │   ├── useOfflineSync.ts       # Cloud sync (TODO)
│   │   └── __tests__/              # Hook tests
│   ├── lib/                        # Librerias y motores
│   │   ├── chordpro/               # Parser de formato ChordPro
│   │   │   ├── parser.ts           # Logica principal de parsing
│   │   │   ├── types.ts            # 65+ tipos para el parser
│   │   │   ├── instrumental.ts     # Parsing de secciones instrumentales
│   │   │   ├── transpose.ts        # Transposicion de acordes
│   │   │   └── index.ts            # Module exports
│   │   ├── timeline/               # Motor de timeline para autoscroll
│   │   │   ├── calculator.ts       # Calculo de beats/barras
│   │   │   └── utils.ts            # Time signature parsing, conversiones
│   │   ├── audio/
│   │   │   └── webAudioUtils.ts    # Web Audio API compatibility
│   │   ├── db.ts                   # Dexie database setup
│   │   ├── routes.ts               # Constantes de rutas centralizadas
│   │   └── utils.ts                # cn() helper para class merging
│   ├── styles/
│   │   └── globals.css             # Tailwind + CSS custom properties
│   ├── types/                      # Definiciones de tipos TypeScript
│   │   ├── index.ts                # Re-exports
│   │   ├── profile.ts              # UserProfile, AppSettings, preferences
│   │   ├── setlist.ts              # Song, Setlist, CRUD inputs
│   │   ├── song.ts                 # SongPlayerState, filters, ChordPro types
│   │   ├── tuner.ts                # PitchInfo, TuningPreset, calibration
│   │   └── timeline.ts             # TimelineElement, SongTimeline
│   ├── router.tsx                  # Router config con React Query
│   └── routeTree.gen.ts            # Auto-generated route tree
├── contracts/                      # Contratos YAML para desarrollo con agentes IA
│   ├── core/                       # Contratos fundamentales
│   │   ├── stack.yaml              # Stack tecnologico
│   │   ├── naming.yaml             # Convenciones de nomenclatura
│   │   ├── styles.yaml             # Sistema de diseno y estilos
│   │   └── git-strategy.yaml       # Estrategia Git
│   ├── data/
│   │   └── database.yaml           # Schema Dexie/IndexedDB
│   ├── business/
│   │   └── business-rules.yaml     # Reglas de negocio del dominio musical
│   ├── features/                   # Contratos por feature
│   │   ├── songs.yaml              # Gestion de canciones + ChordPro
│   │   ├── player.yaml             # Reproductor + autoscroll + timeline
│   │   ├── setlists.yaml           # Setlists + drag-and-drop
│   │   ├── metronome.yaml          # Metronomo + tap tempo
│   │   ├── tuner.yaml              # Afinador + pitch detection
│   │   └── profile.yaml            # Perfil + settings
│   └── shared/
│       └── domain-types.yaml       # Mapa de tipos TypeScript
├── tests/
│   ├── setup.ts                    # Vitest setup (mocks, cleanup)
│   ├── mocks/                      # Test mocks
│   └── utils/                      # Test utilities
├── public/
│   ├── manifest.json               # PWA manifest
│   └── icons/                      # App icons (192px, 512px)
├── docs/
│   ├── app-idea.md                 # Este documento
│   ├── profile-and-settings.md     # Especificacion de profile/settings
│   └── GigSync-UI-Idea/            # Mockups HTML de UI
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Funcionalidades Core - Version 1.0

**1. Biblioteca de Canciones** ✓ Implementado
- CRUD completo de canciones con IndexedDB (Dexie)
- Busqueda y filtros (titulo, artista, BPM, tonalidad, tags)
- Importar desde texto con formato ChordPro
- Parser ChordPro completo con secciones instrumentales
- Tags personalizados con multi-value indexing

**2. Reproductor** ✓ Implementado
- Letras con acordes posicionados (ChordPro rendering)
- Smart autoscroll sincronizado con BPM via timeline engine
- Transposicion de tonalidad en tiempo real
- Zoom de texto (100-200%)
- Secciones instrumentales con barras de acordes
- Marcadores de seccion (Intro, Verso, Estribillo, etc.)

**3. Metronomo** ✓ Implementado
- Control de BPM 20-300 con +/- y tap tempo
- Compases: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
- 5 sonidos de click (classic, woodblock, sticks, electronic, silent)
- Tap tempo con calculo por promedio de intervalos
- Beat visual con acento en primer tiempo
- Subdivisiones opcionales
- Audio via Tone.js

**4. Modo Performance** ✓ Implementado
- Tema extreme-dark (negro OLED #05060b)
- Tipografia ajustable (100-200%)
- Autoscroll configurable
- Toggle de acordes y metronomo visual

**5. Afinador** ✓ Implementado
- Deteccion cromatica con pitchfinder
- Dial cromatico con 12 notas
- Aguja de cents (-50 a +50)
- Calibracion A4 ajustable (420-460 Hz)
- 6 presets: Standard, Drop D, Half Step Down, Open G, Bass, Ukulele
- Manejo de permisos de microfono

**6. Setlists** ✓ Implementado
- CRUD de setlists con IndexedDB
- Duracion total calculada
- Reordenar con drag & drop (@dnd-kit)
- Modo play secuencial

**7. Perfil y Configuracion** ✓ Implementado
- Perfil de usuario con instrumento, banda, avatar
- Settings organizados por feature (metronomo, tuner, performance, player)
- Persistencia en localStorage
- Defaults razonables para todos los settings

### Roadmap Post-MVP

**Version 1.1:**
- Editor visual de canciones con preview
- Diagramas de acordes
- Exportar a PDF
- Estadisticas reales desde IndexedDB (actualmente hardcoded)

**Version 1.2:**
- Sync en la nube (backend, hook placeholder existe)
- Compartir canciones entre dispositivos
- Colaboracion con banda
- Exportar/importar datos JSON

**Version 2.0:**
- Grabacion de sesiones
- Loops de seccion para practica
- Tracking de progreso
- CI/CD pipeline
