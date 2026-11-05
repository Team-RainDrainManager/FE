export type DrainMapStatus =
  | 'unadopted'
  | 'normal'
  | 'overdue'
  | 'blocked'
  | 'risk'
  | 'unknown'

export type DrainMapFilter =
  | 'all'
  | 'unadopted'
  | 'normal'
  | 'overdue'
  | 'blocked'

export type AdoptionStatus = 'AVAILABLE' | 'ADOPTED'


export interface DrainMapItem {
  id: number
  name: string
  address: string | null
  nickname: string | null

  latitude: number | null
  longitude: number | null

  adoptionStatus: AdoptionStatus | null
  isRisk: boolean | null

  status: DrainMapStatus

  // 새 백엔드 응답
  displayStatus?: string | null
  displayStatusLabel?: string | null
  dirtLevel?: number | null
  levelTitle?: string | null

  level: number | null

  // 기존 컴포넌트 호환용 (서버의 xp 매핑)
  score: number | null
}


export interface PositionedDrainMapItem extends DrainMapItem {
  latitude: number
  longitude: number
}

export interface MapBoundsParams {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

export function hasCoordinates(
  drain: DrainMapItem,
): drain is PositionedDrainMapItem {
  return (
    drain.latitude !== null &&
    drain.longitude !== null &&
    Number.isFinite(drain.latitude) &&
    Number.isFinite(drain.longitude)
  )
}
