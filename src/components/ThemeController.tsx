import { useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { fetchSky } from '../utils/sky'
import '../theme.css'
import '../theme-refined.css'
import '../theme-parity.css'

export default function ThemeController() {
  const mode = useThemeStore(s => s.mode)
  const place = useThemeStore(s => s.location)
  const sun = useThemeStore(s => s.sun)
  const setSun = useThemeStore(s => s.setSun)

  useEffect(() => {
    const controller = new AbortController()
    const update = () => {
      void fetchSky(place.latitude, place.longitude, controller.signal)
        .then(sky => setSun({sunrise: sky.sunrise, sunset: sky.sunset}))
        .catch(() => setSun(null))
    }
    update()
    const interval = window.setInterval(update, 60 * 60 * 1000)
    return () => { controller.abort(); window.clearInterval(interval) }
  }, [place.latitude, place.longitude, setSun])

  useEffect(() => {
    const refresh = () => {
      const now = new Date()
      // 서버 정보를 읽기 전에는 06:00~18:00 임시 시간대를 사용합니다.
      const isDay = sun
        ? now >= new Date(sun.sunrise) && now < new Date(sun.sunset)
        : now.getHours() >= 6 && now.getHours() < 18
      document.documentElement.dataset.ddTheme = mode === 'sun' ? (isDay ? 'light' : 'dark') : mode
    }
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [mode, sun])
  return null
}
