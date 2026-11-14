/**
 * Playing the band's instruments live from a MIDI controller (pure part): which
 * role the keys play, which drum a pad or key hits, and the choice remembered
 * on this device.
 */

import type { DrumPart } from '~/lib/audio/bandSound'

/** The band's five roles, as the controller can play them. */
export const MONITOR_ROLES = ['drums', 'bass', 'keys', 'lead', 'arrangement'] as const
export type MonitorRole = (typeof MONITOR_ROLES)[number]

export const MONITOR_ROLE_LABELS: Record<MonitorRole, string> = {
  drums: 'Batería',
  bass: 'Bajo',
  keys: 'Piano',
  lead: 'Melodía',
  arrangement: 'Arreglos',
}

/**
 * The drum a pitch hits, by its note name — which is where General MIDI puts
 * them, so pads work as they come from the factory (36 C = kick, 38 D and
 * 40 E = snare, 42/44/46 F♯ G♯ A♯ = hi-hat) and on the keys every octave is a
 * small kit: C and C♯ the kick, D to E the snare, the rest the hi-hat.
 */
export function drumPartForPitch(pitch: number): DrumPart {
  const pitchClass = ((Math.round(pitch) % 12) + 12) % 12
  if (pitchClass <= 1) return 'kick'
  if (pitchClass <= 4) return 'snare'
  return 'hat'
}

export interface LiveMonitorPrefs {
  enabled: boolean
  role: MonitorRole
}

export const DEFAULT_LIVE_MONITOR_PREFS: LiveMonitorPrefs = { enabled: false, role: 'keys' }

const STORAGE_KEY = 'gigsync:liveMonitor'

/** What is stored → valid prefs (anything unknown falls back to the default). */
export function parseLiveMonitorPrefs(raw: string | null | undefined): LiveMonitorPrefs {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<LiveMonitorPrefs>) : null
    if (!value || typeof value !== 'object') return DEFAULT_LIVE_MONITOR_PREFS
    return {
      enabled: value.enabled === true,
      role: (MONITOR_ROLES as readonly string[]).includes(value.role ?? '') ? (value.role as MonitorRole) : DEFAULT_LIVE_MONITOR_PREFS.role,
    }
  } catch {
    return DEFAULT_LIVE_MONITOR_PREFS
  }
}

export function loadLiveMonitorPrefs(): LiveMonitorPrefs {
  try {
    return parseLiveMonitorPrefs(globalThis.localStorage?.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_LIVE_MONITOR_PREFS
  }
}

export function saveLiveMonitorPrefs(prefs: LiveMonitorPrefs): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Private mode or storage full: the choice just lasts for this visit.
  }
}
