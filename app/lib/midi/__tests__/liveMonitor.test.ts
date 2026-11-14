import { describe, it, expect } from 'vitest'
import { DEFAULT_LIVE_MONITOR_PREFS, drumPartForPitch, parseLiveMonitorPrefs } from '../liveMonitor'

describe('drumPartForPitch', () => {
  it('puts the General MIDI pad notes on their drum', () => {
    expect(drumPartForPitch(36)).toBe('kick')
    expect(drumPartForPitch(35)).toBe('hat') // B: not a kick here, the kick is C / C♯
    expect(drumPartForPitch(38)).toBe('snare')
    expect(drumPartForPitch(40)).toBe('snare')
    expect([42, 44, 46].map(drumPartForPitch)).toEqual(['hat', 'hat', 'hat'])
  })

  it('makes every octave of the keys a small kit', () => {
    expect([60, 61, 62, 63, 64, 65, 71].map(drumPartForPitch)).toEqual(['kick', 'kick', 'snare', 'snare', 'snare', 'hat', 'hat'])
  })
})

describe('parseLiveMonitorPrefs', () => {
  it('reads what was saved', () => {
    expect(parseLiveMonitorPrefs('{"enabled":true,"role":"bass"}')).toEqual({ enabled: true, role: 'bass' })
  })

  it('falls back to the default for anything else', () => {
    expect(parseLiveMonitorPrefs(null)).toEqual(DEFAULT_LIVE_MONITOR_PREFS)
    expect(parseLiveMonitorPrefs('not json')).toEqual(DEFAULT_LIVE_MONITOR_PREFS)
    expect(parseLiveMonitorPrefs('{"enabled":"yes","role":"tuba"}')).toEqual({ enabled: false, role: 'keys' })
  })
})
