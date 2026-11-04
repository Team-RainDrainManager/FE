import { create } from 'zustand'
import { DEFAULT_REGION } from '../utils/sky'
export type ThemeMode = 'light' | 'dark' | 'sun'
const MODE_KEY = 'ddorang:theme-mode'
const PLACE_KEY = 'ddorang:theme-location'
function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(MODE_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'sun' ? saved : 'light'
  } catch { return 'light' }
}
function readPlace() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null') as {latitude?: unknown;longitude?: unknown}|null
    if (typeof saved?.latitude === 'number' && typeof saved.longitude === 'number') return { latitude: saved.latitude, longitude: saved.longitude }
  } catch { /* 저장소 사용 불가 */ }
  return DEFAULT_REGION
}
export const useThemeStore = create<{
  mode: ThemeMode
  location: {latitude: number; longitude: number}
  sun: {sunrise: string; sunset: string} | null
  sunUpdated: boolean
  setMode: (value: ThemeMode) => void
  setLocation: (latitude: number, longitude: number) => void
  setSun: (sun: { sunrise: string; sunset: string } | null) => void
}>(set => ({
  mode: readMode(), location: readPlace(), sun: null, sunUpdated: false,
  setMode: value => { try { localStorage.setItem(MODE_KEY, value) } catch { /* ignore */ } set({mode:value}) },
  setLocation: (latitude, longitude) => {
    const location = { latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 }
    try { localStorage.setItem(PLACE_KEY, JSON.stringify(location)) } catch { /* ignore */ }
    set({location})
  },
  setSun: sun => set({sun, sunUpdated: sun !== null}),
}))
