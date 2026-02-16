## Seccion de Profile/Settings

### Datos del Perfil

```typescript
// app/types/profile.ts

interface UserProfile {
  id: string
  name: string
  instrument: string    // "Guitar", "Bass", "Vocals", etc.
  band?: string
  avatar?: string       // Base64 o URL local
  createdAt: Date
  updatedAt: Date
}

interface AppSettings {
  id: string
  theme: 'light' | 'dark' | 'auto'
  language: 'es' | 'en'
  metronome: MetronomePreferences
  tuner: TunerPreferences
  performance: PerformancePreferences
  player: PlayerPreferences
  sync: SyncPreferences
  updatedAt: Date
}

interface MetronomePreferences {
  defaultBpm: number            // 20-300, default 120
  defaultTimeSignature: string  // default "4/4"
  sound: 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'
  volume: number                // 0-100, default 80
  subdivisions: boolean         // default false
  accentFirst: boolean          // default true
}

interface TunerPreferences {
  calibration: number           // A4 Hz, default 440
  defaultTuning: string         // "Standard", "Drop D", etc.
  showFrequency: boolean        // default true
}

interface PerformancePreferences {
  fontSize: number              // 100-200%, default 100
  theme: 'dark' | 'extreme-dark'
  autoScrollSpeed: number       // 1-10, default 5
  showChords: boolean           // default true
  showMetronome: boolean        // default true
}

interface PlayerPreferences {
  scrollBehavior: 'auto' | 'manual'
  scrollSensitivity: number     // 1-10, default 5
  defaultZoom: number           // 100-200%, default 100
}

interface SyncPreferences {
  enableCloudBackup: boolean    // default false
  autoSync: boolean             // default false
  lastSyncDate?: Date
}
```

### Almacenamiento

Profile y Settings se almacenan en **localStorage** (no en IndexedDB):
- `useProfile` hook para CRUD del perfil
- `useSettings` hook para CRUD de settings
- Se inicializan con `DEFAULT_PROFILE` y `DEFAULT_SETTINGS` al primer uso
- Ver constantes en `app/types/profile.ts`

### Estructura de Rutas

```
app/routes/
└── profile/
    ├── index.tsx          # Vista general del perfil
    └── settings.tsx       # Configuracion detallada
```

### Componentes

```
app/components/profile/
├── ProfileForm.tsx           # Formulario de edicion de perfil
├── ProfileHeader.tsx         # Header con avatar, nombre, instrumento
├── ProfileStats.tsx          # Estadisticas de uso
├── AppearanceSettings.tsx    # Tema, idioma
├── DataSettings.tsx          # Exportar, backup
├── MetronomeSettings.tsx     # Defaults del metronomo
├── PerformanceSettings.tsx   # Modo performance
├── PlayerSettings.tsx        # Defaults del reproductor
├── TunerSettings.tsx         # Calibracion del afinador
└── SettingsSection.tsx       # Wrapper reutilizable de seccion
```

### Pantallas

**1. `/profile` - Vista General**
- Foto de perfil
- Nombre
- Instrumento principal
- Banda (opcional)
- Estadisticas:
  - Total de canciones en biblioteca
  - Cancion mas tocada
  - Total de setlists
  - Minutos de practica
  - Ultima sesion

**2. `/profile/settings` - Configuracion**

Organizada en secciones con `SettingsSection` wrapper:

**Perfil**
- Editar nombre
- Cambiar instrumento (lista predefinida: Guitar, Bass, Vocals, Drums, Keyboard, Piano, Saxophone, Trumpet, Violin, Cello, Ukulele, Other)
- Banda
- Foto de perfil

**Apariencia**
- Tema general (Light/Dark/Auto)
- Idioma (ES/EN)

**Metronomo**
- BPM por defecto (20-300)
- Compas por defecto
- Sonido preferido
- Volumen (0-100)
- Activar subdivisiones
- Acento en primer tiempo

**Afinador**
- Calibracion A4 (420-460 Hz)
- Afinacion por defecto
- Mostrar frecuencia en Hz

**Modo Performance**
- Tema (Dark/Extreme Dark)
- Tamano de fuente (100-200%)
- Velocidad de autoscroll (1-10)
- Mostrar acordes
- Mostrar metronomo visual

**Reproductor**
- Comportamiento de scroll (Auto/Manual)
- Sensibilidad de scroll (1-10)
- Zoom por defecto (100-200%)

**Datos y Privacidad**
- Habilitar backup en la nube (TODO)
- Auto-sincronizacion (TODO)
- Exportar todos los datos JSON (TODO)
- Importar datos (TODO)
- Borrar todos los datos (con confirmacion)

### Hooks

```typescript
// app/hooks/useProfile.ts
function useProfile() {
  return {
    profile: UserProfile,
    isLoading: boolean,
    error: Error | null,
    updateProfile: (updates: Partial<UserProfile>) => void,
    resetProfile: () => void,
  }
}

// app/hooks/useSettings.ts
function useSettings() {
  return {
    settings: AppSettings,
    isLoading: boolean,
    updateSettings: (updates: Partial<AppSettings>) => void,
    resetSettings: () => void,
  }
}

// app/hooks/useStats.ts
// TODO: Calcular stats reales desde IndexedDB
function useStats() {
  return {
    stats: UserStats,
  }
}
```

### Navegacion

```typescript
// app/lib/routes.ts
const ROUTES = {
  HOME: '/',
  SETLISTS: '/setlists',
  METRONOME: '/metronome',
  TUNER: '/tuner',
  PROFILE: '/profile',
  PROFILE_SETTINGS: '/profile/settings',
} as const

// app/components/navigation/BottomNav.tsx
// Items: Home, Setlists, Metronome, Tuner, Profile
```

### Contratos Relacionados

Para especificaciones detalladas ver:
- `contracts/features/profile.yaml` - Contrato completo del feature
- `contracts/business/business-rules.yaml` - Reglas de negocio de profile/settings
- `contracts/shared/domain-types.yaml` - Tipos compartidos
