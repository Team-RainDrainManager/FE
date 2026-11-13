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
  | 'inspection-needed'
  | 'blocked'

export type AdoptionStatus = 'AVAILABLE' | 'ADOPTED'

export type RainRequestStatus = 'NEEDS_HELP' | 'IN_PROGRESS' | 'DONE'

export interface RainRequestSummary {
  requestId: number
  status: RainRequestStatus
}


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
  rainRequest: RainRequestSummary | null

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

export function needsInspection(drain: DrainMapItem): boolean {
  return drain.status === 'overdue' || drain.rainRequest?.status === 'NEEDS_HELP'
}

/** 지도에서 빗물받이 하나가 속하는 분류. 필터 · 마커 색 · 목록 표시가 모두 이 값을 씁니다. */
export type DrainCategory = 'blocked' | 'unadopted' | 'inspection-needed' | 'normal' | 'unknown'

/**
 * 막힘 제보 → 미입양 → 점검 필요 → 정상 순서로 하나만 정합니다.
 * - 막힘 제보는 입양 여부와 상관없이 막힘 제보 (빨강)
 * - 입양되지 않은 빗물받이는 비 예보로 도움이 필요해도 미입양 (흰색 · 회색)
 * - 입양된 빗물받이는 점검일이 지났거나 비 예보로 도움이 필요하면 점검 필요 (노랑)
 */
export function drainCategory(drain: DrainMapItem): DrainCategory {
  if (drain.status === 'blocked') return 'blocked'
  if (drain.status === 'unadopted' || drain.adoptionStatus === 'AVAILABLE') return 'unadopted'
  if (needsInspection(drain)) return 'inspection-needed'
  if (drain.status === 'normal') return 'normal'
  return 'unknown'
}

/** 선택한 필터에 이 빗물받이가 보여야 하는지 */
export function matchesFilter(drain: DrainMapItem, filter: DrainMapFilter): boolean {
  return filter === 'all' || drainCategory(drain) === filter
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
