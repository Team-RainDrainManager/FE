import { useEffect, useState } from 'react'

export type Coordinates = { latitude: number; longitude: number }
export type Fix = Coordinates & { accuracy: number; at: number }
export type GeoStatus = 'waiting' | 'ok' | 'denied' | 'unavailable'

/** 촬영 화면이 떠 있는 동안 위치를 계속 받습니다. 실패해도 촬영은 막지 않습니다. */
export function useGeolocation() {
  const [fix, setFix] = useState<Fix | null>(null)
  const [status, setStatus] = useState<GeoStatus>(() =>
    'geolocation' in navigator ? 'waiting' : 'unavailable',
  )

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setFix({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          at: Date.now(),
        })
        setStatus('ok')
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { fix, status }
}

/** 두 좌표 사이의 거리(m)입니다. 서버 GeoDistance와 같은 하버사인 계산입니다. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const earthRadius = 6_371_000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRadians(b.latitude - a.latitude)
  const dLng = toRadians(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}

export function distanceText(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`
}
