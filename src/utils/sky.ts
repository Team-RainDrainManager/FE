export type SkyData = {
  rain: boolean
  weatherCode: number
  temperature: number | null
  sunrise: string
  sunset: string
}

// 위치 권한을 허용하지 않은 경우, 서비스 시범 지역(역곡 인근) 기준으로 표시합니다.
export const DEFAULT_REGION = { latitude: 37.487, longitude: 126.8 }

export async function fetchSky(latitude: number, longitude: number, signal?: AbortSignal): Promise<SkyData> {
  const params = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude),
    current: 'temperature_2m,weather_code,precipitation,rain',
    daily: 'sunrise,sunset', timezone: 'auto', forecast_days: '1',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!response.ok) throw new Error('날씨 서비스에 연결할 수 없습니다.')
  const json: unknown = await response.json()
  if (!json || typeof json !== 'object') throw new Error('날씨 응답 형식 오류')
  const result = json as {
    current?: { temperature_2m?: number; weather_code?: number; precipitation?: number; rain?: number }
    daily?: { sunrise?: string[]; sunset?: string[] }
  }
  const code = result.current?.weather_code ?? -1
  const sunrise = result.daily?.sunrise?.[0]
  const sunset = result.daily?.sunset?.[0]
  if (!sunrise || !sunset) throw new Error('일출·일몰 정보가 없습니다.')
  return {
    rain: (result.current?.rain ?? 0) > 0 || (result.current?.precipitation ?? 0) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code),
    weatherCode: code, temperature: result.current?.temperature_2m ?? null, sunrise, sunset,
  }
}
