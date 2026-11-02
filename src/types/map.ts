export type DrainMapStatus =
  | 'unadopted'
  | 'normal'
  | 'overdue'
  | 'blocked'

export type DrainMapFilter = 'all' | DrainMapStatus

export type AdoptionStatus = 'AVAILABLE' | 'ADOPTED'

export interface DrainMapItem {
  id: number
  name: string
  address: string
  nickname: string | null

  latitude: number
  longitude: number

  adoptionStatus: AdoptionStatus
  isRisk: boolean

  // 목업 UI용 필드
  status: DrainMapStatus
  level: number
  xp: number
}

export interface MapBoundsParams {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}