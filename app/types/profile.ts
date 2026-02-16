// Profile and Settings Types

export interface UserProfile {
  id: string
  name: string
  instrument: string // "Guitar", "Bass", "Vocals", etc.
  band?: string
  avatar?: string // Base64 or local URL
  createdAt: Date
  updatedAt: Date
}

export interface MetronomePreferences {
  defaultBpm: number
  defaultTimeSignature: string
  sound: 'classic' | 'woodblock' | 'sticks' | 'electronic' | 'silent'
  volume: number // 0-100
  subdivisions: boolean
  accentFirst: boolean
}

export interface TunerPreferences {
  calibration: number // A4 Hz (default 440)
  defaultTuning: string // "Standard", "Drop D", etc.
  showFrequency: boolean
}

export interface PerformancePreferences {
  fontSize: number // 100-200%
  theme: 'dark' | 'extreme-dark'
  autoScrollSpeed: number // 1-10
  showChords: boolean
  showMetronome: boolean
}

export interface PlayerPreferences {
  scrollBehavior: 'auto' | 'manual'
  scrollSensitivity: number // 1-10
  defaultZoom: number // 100-200%
  /**
   * Position of the current line within the viewport for Smart Autoscroll.
   * Expressed as a percentage of the container height (0-100).
   * Default is 33 (roughly one third from the top, like reading a book).
   */
  smartScrollContextWindow: number
  /**
   * Smoothness of Smart Autoscroll animations.
   * 0-100, where higher values mean longer/slower interpolation.
   * Mapped internally to a scroll duration in milliseconds.
   */
  smartScrollSmoothness: number
  /**
   * When true, shows a debug beat/bar indicator overlay during Smart Autoscroll.
   */
  showBeatIndicatorDebug: boolean
}

export interface SyncPreferences {
  enableCloudBackup: boolean
  autoSync: boolean
  lastSyncDate?: Date
}

export interface AppSettings {
  id: string
  // General
  theme: 'light' | 'dark' | 'auto'
  language: 'es' | 'en'
  // Feature preferences
  metronome: MetronomePreferences
  tuner: TunerPreferences
  performance: PerformancePreferences
  player: PlayerPreferences
  sync: SyncPreferences
  updatedAt: Date
}

export interface UserStats {
  totalSongs: number
  totalSetlists: number
  mostPlayedSong?: {
    id: string
    title: string
    playCount: number
  }
  totalPracticeMinutes: number
  lastSessionDate?: Date
}

// Default values
export const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  instrument: 'Guitar',
  band: '',
  avatar: undefined,
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'updatedAt'> = {
  theme: 'auto',
  language: 'en',
  metronome: {
    defaultBpm: 120,
    defaultTimeSignature: '4/4',
    sound: 'classic',
    volume: 80,
    subdivisions: false,
    accentFirst: true,
  },
  tuner: {
    calibration: 440,
    defaultTuning: 'Standard',
    showFrequency: true,
  },
  performance: {
    fontSize: 100,
    theme: 'dark',
    autoScrollSpeed: 5,
    showChords: true,
    showMetronome: true,
  },
  player: {
    scrollBehavior: 'auto',
    scrollSensitivity: 5,
    defaultZoom: 100,
    smartScrollContextWindow: 33,
    smartScrollSmoothness: 70,
    showBeatIndicatorDebug: false,
  },
  sync: {
    enableCloudBackup: false,
    autoSync: false,
    lastSyncDate: undefined,
  },
}

export const INSTRUMENTS = [
  'Guitar',
  'Bass',
  'Vocals',
  'Drums',
  'Keyboard',
  'Piano',
  'Saxophone',
  'Trumpet',
  'Violin',
  'Cello',
  'Ukulele',
  'Other',
] as const

export const TUNINGS = [
  'Standard',
  'Drop D',
  'Drop C',
  'Half Step Down',
  'Full Step Down',
  'Open G',
  'Open D',
  'DADGAD',
] as const

export type Instrument = (typeof INSTRUMENTS)[number]
export type Tuning = (typeof TUNINGS)[number]
