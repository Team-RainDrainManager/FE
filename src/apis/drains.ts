
import { apiClient } from './axios-instance'

import type {
  AdoptionStatus,
  DrainMapItem,
  DrainMapStatus,
  MapBoundsParams,
} from '../types/map'

interface ApiResponse<T> {
  success: boolean
  data: T
  error: {
    code: string
    message: string
  } | null
}

// GET /api/v1/drain 응답
interface DrainListDto {
  id: number
  name?: string | null
  address?: string | null

  latitude: number | null
  longitude: number | null

  adoptionStatus: AdoptionStatus | null
  risk?: boolean | null

  status?: string | null
  displayStatus?: string | null
  displayStatusLabel?: string | null

  dirtLevel?: number | null
  level?: number | null
  levelTitle?: string | null

  xp?: number | null
  score?: number | null
  nickname?: string | null
}

// GET /api/v1/drain/{drainId} 응답
export interface DrainDetailDto {
  id: number
  name?: string | null
  address?: string | null

  status: 'ACTIVE' | 'PENDING' | 'REMOVED'
  adoptionStatus: AdoptionStatus

  displayStatus?: string | null
  displayStatusLabel?: string | null
  risk?: boolean | null

  latitude: number
  longitude: number
  photoUrl: string | null
  dirtLevel: number

  level?: number | null
  levelTitle?: string | null
  xp?: number | null
  nextLevelScore?: number | null
  progressPercent?: number | null

  adoption: {
    adoptionId: number
    nickname: string
    level: number
    score: number
    adoptedAt: string
    lastManagedAt: string | null
    nextManagementAt: string | null
  } | null
}

function validCoordinate(
  value: number | null | undefined,
  limit: number,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > limit
  ) {
    return null
  }

  return value
}

const MAP_STATUSES: readonly DrainMapStatus[] = [
  'unadopted',
  'normal',
  'overdue',
  'blocked',
  'risk',
  'unknown',
]

// 백엔드의 지도용 status를 우선 사용
function resolveMapStatus({
  status,
  displayStatus,
  adoptionStatus,
  risk,
}: {
  status?: string | null
  displayStatus?: string | null
  adoptionStatus: AdoptionStatus | null
  risk: boolean | null
}): DrainMapStatus {
  if (
    status &&
    MAP_STATUSES.some((item) => item === status)
  ) {
    return status as DrainMapStatus
  }

  // 상세 API는 status가 ACTIVE 등의 등록 상태이므로
  // displayStatus를 지도용 상태로 변환
  switch (displayStatus) {
    case 'BLOCKAGE_REPORTED':
      return 'blocked'

    case 'OVERDUE':
    case 'INSPECTION_OVERDUE':
      return 'overdue'

    case 'AVAILABLE':
      return 'unadopted'

    case 'NORMAL':
      return 'normal'
  }

  // 구형 응답 호환용
  if (adoptionStatus === 'AVAILABLE') {
    return 'unadopted'
  }

  if (adoptionStatus === 'ADOPTED') {
    return 'normal'
  }

  if (risk === true) {
    return 'risk'
  }

  return 'unknown'
}

// 목록 데이터를 화면 표시용으로 변환
function toMapItem(dto: DrainListDto): DrainMapItem {
  const adoptionStatus = dto.adoptionStatus ?? null
  const isRisk = dto.risk ?? null

  return {
    id: dto.id,

    name: dto.name?.trim() || `빗물받이 #${dto.id}`,
    address: dto.address ?? null,
    nickname: dto.nickname ?? null,

    latitude: validCoordinate(dto.latitude, 90),
    longitude: validCoordinate(dto.longitude, 180),

    adoptionStatus,
    isRisk,

    status: resolveMapStatus({
      status: dto.status,
      displayStatus: dto.displayStatus,
      adoptionStatus,
      risk: isRisk,
    }),

    displayStatus: dto.displayStatus ?? null,
    displayStatusLabel: dto.displayStatusLabel ?? null,
    dirtLevel: dto.dirtLevel ?? null,
    levelTitle: dto.levelTitle ?? null,

    level: dto.level ?? null,
    score: dto.xp ?? dto.score ?? null,
  }
}

// 지도 위 빗물받이 목록 조회
export async function getMapDrains(
  bounds: MapBoundsParams,
  signal?: AbortSignal,
): Promise<DrainMapItem[]> {
  const response = await apiClient.get<
    ApiResponse<DrainListDto[]>
  >('/api/v1/drain', {
    params: bounds,
    signal,
  })

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message ??
        '빗물받이 목록 조회에 실패했어요.',
    )
  }

  if (!Array.isArray(response.data.data)) {
    throw new Error(
      '빗물받이 목록 응답 형식이 올바르지 않아요.',
    )
  }

  return response.data.data.map(toMapItem)
}

// 특정 빗물받이 상세 조회
export async function getDrainDetail(
  drainId: number,
  signal?: AbortSignal,
): Promise<DrainDetailDto> {
  const response = await apiClient.get<
    ApiResponse<DrainDetailDto>
  >(`/api/v1/drain/${drainId}`, {
    signal,
  })

  if (!response.data.success) {
    throw new Error(
      response.data.error?.message ??
        '빗물받이 상세 조회에 실패했어요.',
    )
  }

  return response.data.data
}

// 목록 + 상세 정보 병합
export function mergeDrainDetail(
  drain: DrainMapItem,
  detail: DrainDetailDto,
): DrainMapItem {
  const adoptionStatus = detail.adoptionStatus
  const isRisk = detail.risk ?? drain.isRisk

  return {
    ...drain,

    name: detail.name?.trim() || drain.name,
    address: detail.address ?? drain.address,

    latitude: validCoordinate(detail.latitude, 90),
    longitude: validCoordinate(detail.longitude, 180),

    adoptionStatus,
    isRisk,

    nickname:
      detail.adoption?.nickname ?? drain.nickname,

    level:
      detail.level ??
      detail.adoption?.level ??
      drain.level,

    score:
      detail.xp ??
      detail.adoption?.score ??
      drain.score,

    levelTitle:
      detail.levelTitle ?? drain.levelTitle,

    dirtLevel:
      detail.dirtLevel ?? drain.dirtLevel,

    displayStatus:
      detail.displayStatus ?? drain.displayStatus,

    displayStatusLabel:
      detail.displayStatusLabel ??
      drain.displayStatusLabel,

    status: resolveMapStatus({
      // 상세 응답에 별도 표시 상태가 있으면
      // 그것을 우선하고, 없으면 기존 목록 상태 유지
      status: detail.displayStatus
        ? undefined
        : drain.status,
      displayStatus:
        detail.displayStatus ?? drain.displayStatus,
      adoptionStatus,
      risk: isRisk,
    }),
  }
}
