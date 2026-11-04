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
  level: number | null
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
