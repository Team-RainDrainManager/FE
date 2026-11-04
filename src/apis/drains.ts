
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

// 실제 지도 목록 API 응답
interface DrainListDto {
  id: number
  latitude: number
  longitude: number
  adoptionStatus: AdoptionStatus
  risk: boolean

  // 백엔드 추가 예정 필드
  name?: string | null
  level?: number | null
  score?: number | null
  nickname?: string | null
  address?: string | null
}

// 빗물받이 상세 API 응답
export interface DrainDetailDto {
  id: number
  status: 'ACTIVE' | 'PENDING' | 'REMOVED'
  adoptionStatus: AdoptionStatus
  latitude: number
  longitude: number
  photoUrl: string | null
  dirtLevel: number

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

// 위도/경도 유효성 검사
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

// 서버 데이터를 지도 상태로 변환
function getStatus(
  adoptionStatus: AdoptionStatus | null,
  isRisk: boolean | null,
): DrainMapStatus {
  if (adoptionStatus === 'AVAILABLE') {
    return 'unadopted'
  }

  if (isRisk === true) {
    return 'risk'
  }

  if (
    adoptionStatus === 'ADOPTED' &&
    isRisk === false
  ) {
    return 'normal'
  }

  return 'unknown'
}

// 목록 API 응답을 프론트 타입으로 변환
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

    status: getStatus(adoptionStatus, isRisk),

    level: dto.level ?? null,
    score: dto.score ?? null,
  }
}

// GET /api/v1/drain
// 지도 영역 내 빗물받이 목록 조회
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

// GET /api/v1/drain/{drainId}
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

// 목록 데이터를 상세 조회 결과로 보강
export function mergeDrainDetail(
  drain: DrainMapItem,
  detail: DrainDetailDto,
): DrainMapItem {
  const adoptionStatus = detail.adoptionStatus

  return {
    ...drain,

    latitude: validCoordinate(detail.latitude, 90),
    longitude: validCoordinate(detail.longitude, 180),

    adoptionStatus,

    nickname:
      detail.adoption?.nickname ?? drain.nickname,

    level:
      detail.adoption?.level ?? drain.level,

    score:
      detail.adoption?.score ?? drain.score,

    status: getStatus(adoptionStatus, drain.isRisk),
  }
}
