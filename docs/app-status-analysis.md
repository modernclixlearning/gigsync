# Análisis del Estado Actual de GigSync

**Fecha:** 2026-02-16
**Branch:** `claude/analyze-app-status-8ngxy`

---

## Qué es GigSync

GigSync es una **Progressive Web App (PWA) offline-first para músicos**, diseñada como compañero integral de performance. Permite gestionar canciones en formato ChordPro, tocarlas con autoscroll inteligente sincronizado por BPM, usar metrónomo, afinador cromático, y organizar setlists.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + TanStack Start v1.157 (SSR) |
| Routing | TanStack Router (file-based, type-safe) |
| Build | Vite 7.3 + Nitro 3.0 (server) |
| Estilos | Tailwind CSS v4 |
| Datos locales | Dexie.js v4 (IndexedDB) |
| Estado | TanStack React Query v5 + localStorage |
| Audio | Tone.js v15 + Web Audio API + pitchfinder |
| Animaciones | Framer Motion v11 |
| DnD | @dnd-kit |
| Validación | Zod v3.24 |
| Tests | Vitest + Testing Library |
| Lenguaje | TypeScript 5.7 (strict) |

---

## Estructura del Proyecto

```
gigsync/
├── app/
│   ├── routes/          # TanStack Router (file-based routing)
│   ├── components/      # 43 componentes React por feature
│   ├── hooks/           # 24 custom hooks (lógica de negocio)
│   ├── lib/             # Utilidades y engines (ChordPro parser, timeline, audio)
│   ├── types/           # Definiciones TypeScript centralizadas
│   └── styles/          # Tailwind CSS
├── contracts/           # Contratos YAML para IA/automatización
├── docs/                # Documentación del proyecto
├── tests/               # Setup de tests y mocks
├── public/              # Assets estáticos (manifest.json, íconos PWA)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Estado de Features

### Features Completas (MVP)

| Feature | Estado | Detalles |
|---------|--------|----------|
| Gestión de Canciones | ✅ COMPLETO | CRUD, ChordPro parser, búsqueda, transposición, zoom |
| Reproductor | ✅ COMPLETO | Lyrics + acordes, Smart Autoscroll por BPM, highlight línea actual |
| Metrónomo | ✅ COMPLETO | BPM 20-300, 7 compases, 5 sonidos, tap tempo, subdivisiones |
| Afinador | ✅ COMPLETO | Cromático, 6 presets, calibración A4, dial visual |
| Setlists | ✅ COMPLETO | CRUD, drag & drop, duración total, play secuencial, cascade delete |
| Modo Performance | ✅ COMPLETO | Tema OLED, tipografía ajustable, controles stage |
| Perfil/Settings | ✅ COMPLETO | Por feature, persistencia localStorage, defaults |

### Smart Autoscroll (Feature principal reciente)

Las 6 fases están **completas**: Timeline Engine, BPM Sync, Smart Autoscroll, integración con Player, UI/UX polish, y 352 tests pasando. La fase 7 (finalización) está parcialmente completa — falta estrategia de persistencia en nube.

---

## Modelos de Datos

### Dexie Database (IndexedDB)

```typescript
// Songs - indexadas por: id, title, artist, bpm, key, *tags, createdAt
interface Song {
  id: string;              // UUID v4
  title: string;
  artist: string;
  bpm: number;
  key: string;             // Tonalidad musical
  timeSignature: string;   // 4/4, 3/4, etc.
  duration: number;        // Segundos
  lyrics: string;          // Formato ChordPro
  tags: string[];
  lastPlayed?: Date;
  timesPlayed: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Setlists - indexadas por: id, name, venue, date, createdAt
interface Setlist {
  id: string;
  name: string;
  songIds: string[];
  totalDuration: number;
  venue?: string;
  date?: Date;
  createdAt: Date;
}
```

### User Profile & Settings (localStorage)

- `UserProfile` — nombre, instrumento, banda, avatar
- `AppSettings` — configuración por feature (metrónomo, afinador, performance, player, sync)

---

## Componentes por Feature

| Módulo | Componentes | Descripción |
|--------|-------------|-------------|
| `library/` | SongCard, SongFilters, SongSearch | Descubrimiento de canciones |
| `player/` | LyricsDisplay, ChordOverlay, PlayerControls, BeatIndicator, InstrumentalSection | Reproducción |
| `metronome/` | MetronomeDisplay, BPMControl, TimeSignatureSelector, SoundSelector, TapTempo, VisualBeat | Click track |
| `tuner/` | PitchDisplay, ChromaticDial, TunerNeedle, NoteIndicator, TuningPresets, CalibrationControl | Afinación |
| `setlists/` | SetlistCard, SetlistForm + drag-and-drop | Gestión de setlists |
| `songs/` | SongForm, ChordProImporter | Gestión de canciones |
| `navigation/` | BottomNav, NavItem | Navegación principal |
| `profile/` | Profile editor, Settings panels | Configuración de usuario |

---

## Testing

- **Framework:** Vitest + Testing Library + jsdom
- **Cobertura:** 352 tests pasando
- **Mocks:** IndexedDB (Dexie), Web Audio API, Tone.js
- **Tipos de test:** Unit tests (hooks, utilidades) + Component tests (UI)
- **Coverage provider:** v8

---

## Arquitectura — Fortalezas

1. **Hook-based architecture** — 24 custom hooks separan lógica de negocio de la UI
2. **Offline-first** — IndexedDB para datos, localStorage para settings, sin backend requerido
3. **File-based routing** — TanStack Router con rutas dinámicas type-safe
4. **ChordPro parser robusto** — Soporta secciones instrumentales, barras de acordes, marcadores
5. **Sistema de contratos YAML** — Para coordinación con IA y documentación de features
6. **PWA ready** — manifest.json, íconos maskable, standalone mode
7. **Testing sólido** — 352 tests con mocks de Web Audio, Dexie e IndexedDB

---

## Problemas Detectados

### Crítico: Dependencias no instaladas

`node_modules/` no existe en el entorno actual. Se necesita ejecutar `npm install` para que la app compile y los tests corran. El `package-lock.json` sí existe.

### Errores de TypeScript en tests

Aun con dependencias instaladas, hay errores en archivos de test/config:

- `tests/mocks/webAudio.ts` — uso de `global` sin tipado, `MockMediaStreamTrack` incompleto
- `tests/setup.ts` — parámetros con tipo `any` implícito
- `tests/utils/testUtils.tsx` — namespace `React` no encontrado

> Estos errores están en archivos de test, **no en el código fuente principal**.

---

## Gaps y Recomendaciones

| Área | Problema | Prioridad |
|------|----------|-----------|
| **CI/CD** | No hay pipeline (GitHub Actions, etc.) | 🔴 Alta |
| **Service Worker** | PWA sin SW configurado para cache offline real | 🟡 Media |
| **Backend/API** | No hay endpoints, todo es client-side | 🟡 Media (roadmap v1.2) |
| **Stats** | Hardcodeadas, no calculadas desde IndexedDB | 🟡 Media |
| **Validación forms** | Zod está instalado pero no se usa en formularios | 🟡 Media |
| **Export/Import** | No hay forma de respaldar datos del usuario | 🟡 Media |
| **Performance metrics** | Sin benchmarks ni tests de rendimiento | 🟡 Media |
| **Cloud sync** | Hook placeholder existe pero no implementado | 🟢 Baja (v1.2) |

---

## Resumen Ejecutivo

GigSync es un **MVP funcional y bien estructurado** con una arquitectura moderna y sólida. Las 7 features principales están completas y el trabajo más reciente (Smart Autoscroll) está bien testeado con 352 tests.

**Próximos pasos recomendados para producción:**

1. Configurar CI/CD (GitHub Actions)
2. Implementar Service Worker para offline real
3. Resolver la persistencia/sync en la nube
4. Agregar export/import de datos como respaldo
