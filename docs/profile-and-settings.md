¡Totalmente! Tienes razón, falta el **Profile/Settings**.

## Sección de Profile/Settings

### Datos del Perfil

```typescript
interface UserProfile {
  id: string;
  name: string;
  instrument: string; // "Guitar", "Bass", "Vocals", etc.
  band?: string;
  avatar?: string; // Base64 o URL local
  createdAt: Date;
}

interface AppSettings {
  // Preferencias Generales
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  
  // Metronomo
  defaultBpm: number;
  defaultTimeSignature: string;
  metronomeSound: 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent';
  metronomeVolume: number; // 0-100
  subdivisions: boolean;
  
  // Afinador
  tunerCalibration: number; // A4 Hz (default 440)
  defaultTuning: string; // "Standard", "Drop D", etc.
  
  // Player/Performance
  performanceMode: {
    fontSize: number; // 100-200%
    theme: 'dark' | 'extreme-dark';
    autoScrollSpeed: number; // 1-10
    showChords: boolean;
    showMetronome: boolean;
  };
  
  // Scroll
  scrollBehavior: 'auto' | 'manual';
  scrollSensitivity: number;
  
  // Datos y Sync
  enableCloudBackup: boolean;
  autoSync: boolean;
  lastSyncDate?: Date;
}
```

### Estructura Actualizada

```
app/
├── routes/
│   ├── index.tsx              # Dashboard/Biblioteca
│   ├── song.$id.tsx           # Reproductor
│   ├── song.$id.edit.tsx      # Editor
│   ├── metronome.tsx          # Metronomo
│   ├── tuner.tsx              # Afinador
│   ├── performance.tsx        # Modo escenario
│   ├── setlists/
│   │   ├── index.tsx
│   │   └── $id.tsx
│   └── profile/               # 👈 NUEVO
│       ├── index.tsx          # Vista general del perfil
│       └── settings.tsx       # Configuración detallada
```

### Pantallas de Profile

**1. `/profile` - Vista General**
- Foto de perfil
- Nombre
- Instrumento principal
- Banda (opcional)
- Estadísticas:
  - Total de canciones en biblioteca
  - Canción más tocada
  - Total de setlists
  - Horas de práctica (si implementamos tracking)
  - Última sesión

**2. `/profile/settings` - Configuración**

Organizada en secciones:

**Perfil**
- Editar nombre
- Cambiar instrumento
- Banda
- Foto de perfil

**Apariencia**
- Tema general (Light/Dark/Auto)
- Idioma

**Metronomo**
- BPM por defecto
- Compás por defecto
- Sonido preferido
- Volumen
- Activar subdivisiones

**Afinador**
- Calibración A4
- Afinación por defecto
- Mostrar frecuencia en Hz

**Modo Performance**
- Tema (Dark/Extreme Dark)
- Tamaño de fuente (slider 100-200%)
- Velocidad de scroll automático
- Mostrar acordes
- Mostrar metrónomo visual

**Reproductor**
- Comportamiento de scroll (Auto/Manual)
- Sensibilidad de scroll
- Zoom por defecto

**Datos y Privacidad**
- Habilitar backup en la nube (futuro)
- Auto-sincronización
- Exportar todos los datos (JSON)
- Importar datos
- Borrar todos los datos (con confirmación)

**Acerca de**
- Versión de la app
- Créditos
- Términos y condiciones
- Política de privacidad

### Componente de Navegación Actualizado

```typescript
// Navigation con Profile
const navItems = [
  { icon: Library, label: 'Biblioteca', href: '/' },
  { icon: Music, label: 'Setlists', href: '/setlists' },
  { icon: Metronome, label: 'Metronomo', href: '/metronome' },
  { icon: Tuner, label: 'Afinador', href: '/tuner' },
  { icon: User, label: 'Perfil', href: '/profile' }, // 👈 NUEVO
];
```

### Schema IndexedDB Actualizado

```typescript
// Añadir a la base de datos
interface UserProfile {
  id: 'profile'; // Singleton
  name: string;
  instrument: string;
  band?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AppSettings {
  id: 'settings'; // Singleton
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  metronome: {
    defaultBpm: number;
    defaultTimeSignature: string;
    sound: string;
    volume: number;
    subdivisions: boolean;
  };
  tuner: {
    calibration: number;
    defaultTuning: string;
    showFrequency: boolean;
  };
  performance: {
    fontSize: number;
    theme: 'dark' | 'extreme-dark';
    autoScrollSpeed: number;
    showChords: boolean;
    showMetronome: boolean;
  };
  scroll: {
    behavior: 'auto' | 'manual';
    sensitivity: number;
  };
  sync: {
    enableCloudBackup: boolean;
    autoSync: boolean;
    lastSyncDate?: Date;
  };
  updatedAt: Date;
}
```

### Hook para Settings

```typescript
// hooks/useSettings.ts
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  const updateSettings = async (updates: Partial<AppSettings>) => {
    // Actualizar en IndexedDB
    // Actualizar estado local
  };
  
  const resetSettings = async () => {
    // Restaurar valores por defecto
  };
  
  return { settings, updateSettings, resetSettings };
}
```
