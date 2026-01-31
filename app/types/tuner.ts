// Tuner Types

/**
 * Musical note names in the chromatic scale
 */
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

/**
 * Detected pitch information
 */
export interface PitchInfo {
  /** Detected frequency in Hz */
  frequency: number
  /** Closest note name */
  note: NoteName
  /** Octave number (e.g., 4 for A4=440Hz) */
  octave: number
  /** Cents deviation from perfect pitch (-50 to +50) */
  cents: number
  /** Confidence level of detection (0-1) */
  confidence: number
}

/**
 * Common tuning presets for string instruments
 */
export interface TuningPreset {
  id: string
  name: string
  /** Instrument this tuning is for */
  instrument: 'guitar' | 'bass' | 'ukulele' | 'violin' | 'custom'
  /** Notes from lowest to highest string */
  notes: Array<{ note: NoteName; octave: number }>
}

/**
 * Calibration settings for the tuner
 */
export interface CalibrationSettings {
  /** Reference frequency for A4 (default 440Hz) */
  referenceFrequency: number
  /** Sensitivity threshold (0-1) */
  sensitivity: number
}

/**
 * Tuner state
 */
export interface TunerState {
  /** Whether the tuner is actively listening */
  isListening: boolean
  /** Whether microphone access has been granted */
  hasPermission: boolean
  /** Current detected pitch info */
  pitch: PitchInfo | null
  /** Current calibration settings */
  calibration: CalibrationSettings
  /** Selected tuning preset */
  preset: TuningPreset | null
  /** Error message if any */
  error: string | null
}

/**
 * Microphone state
 */
export interface MicrophoneState {
  /** Whether the microphone is active */
  isActive: boolean
  /** Whether permission has been granted */
  hasPermission: boolean
  /** Whether permission is being requested */
  isRequesting: boolean
  /** Error message if any */
  error: string | null
  /** Audio context sample rate */
  sampleRate: number | null
}

/**
 * Default tuning presets
 */
export const DEFAULT_TUNING_PRESETS: TuningPreset[] = [
  {
    id: 'guitar-standard',
    name: 'Standard',
    instrument: 'guitar',
    notes: [
      { note: 'E', octave: 2 },
      { note: 'A', octave: 2 },
      { note: 'D', octave: 3 },
      { note: 'G', octave: 3 },
      { note: 'B', octave: 3 },
      { note: 'E', octave: 4 },
    ],
  },
  {
    id: 'guitar-drop-d',
    name: 'Drop D',
    instrument: 'guitar',
    notes: [
      { note: 'D', octave: 2 },
      { note: 'A', octave: 2 },
      { note: 'D', octave: 3 },
      { note: 'G', octave: 3 },
      { note: 'B', octave: 3 },
      { note: 'E', octave: 4 },
    ],
  },
  {
    id: 'guitar-half-step-down',
    name: 'Half Step Down',
    instrument: 'guitar',
    notes: [
      { note: 'D#', octave: 2 },
      { note: 'G#', octave: 2 },
      { note: 'C#', octave: 3 },
      { note: 'F#', octave: 3 },
      { note: 'A#', octave: 3 },
      { note: 'D#', octave: 4 },
    ],
  },
  {
    id: 'guitar-open-g',
    name: 'Open G',
    instrument: 'guitar',
    notes: [
      { note: 'D', octave: 2 },
      { note: 'G', octave: 2 },
      { note: 'D', octave: 3 },
      { note: 'G', octave: 3 },
      { note: 'B', octave: 3 },
      { note: 'D', octave: 4 },
    ],
  },
  {
    id: 'bass-standard',
    name: 'Bass Standard',
    instrument: 'bass',
    notes: [
      { note: 'E', octave: 1 },
      { note: 'A', octave: 1 },
      { note: 'D', octave: 2 },
      { note: 'G', octave: 2 },
    ],
  },
  {
    id: 'ukulele-standard',
    name: 'Ukulele',
    instrument: 'ukulele',
    notes: [
      { note: 'G', octave: 4 },
      { note: 'C', octave: 4 },
      { note: 'E', octave: 4 },
      { note: 'A', octave: 4 },
    ],
  },
]

/**
 * Default calibration settings
 */
export const DEFAULT_CALIBRATION: CalibrationSettings = {
  referenceFrequency: 440,
  sensitivity: 0.5,
}
