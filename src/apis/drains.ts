
import { AI_REQUEST_TIMEOUT_MS, apiClient } from './axios-instance'

import type {
  AdoptionStatus,
  DrainMapItem,
  DrainMapStatus,
  MapBoundsParams,
  RainRequestSummary,
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
  rainRequest?: RainRequestSummary | null
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
  rainRequest?: RainRequestSummary | null

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
    case 'MANAGEMENT_DELAYED':
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

    rainRequest: dto.rainRequest ?? null,
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

    rainRequest:
      detail.rainRequest === undefined ? drain.rainRequest : detail.rainRequest,

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

// POST /api/v1/drain/assessments — 사진 한 장 AI 사전 판독 (저장하지 않음)
export interface DrainAssessmentResponse {
  grade: number
  dirtLevel: number
  isRisk: boolean
  needsReport: boolean
  confidence: number
  reason: string
}

export async function assessDrainPhoto(
  photoKey: string,
): Promise<DrainAssessmentResponse> {
  const key = photoKey.trim()
  if (!key) {
    throw new Error('판독할 사진의 업로드 키가 필요해요.')
  }

  const { data: body } = await apiClient.post<
    ApiResponse<DrainAssessmentResponse | null>
  >('/api/v1/drain/assessments', { photoKey: key })

  if (!body.success || !body.data) {
    throw new Error(
      body.error?.message ?? '사진 판독에 실패했어요.',
    )
  }

  return body.data
}

/** POST /api/v1/drain - 현장에서 빗물받이 신규 등록 */
export type DrainDisplayStatus =
  | 'AVAILABLE'
  | 'NORMAL'
  | 'MANAGEMENT_DELAYED'
  | 'BLOCKAGE_REPORTED'

export interface DrainCreateRequest {
  latitude: number
  longitude: number
  photoKey: string
  name: string
  address: string
  isRisk: boolean
  riskDescription: string
}

export interface DrainCreateResponse {
  id: number
  name: string
  address: string
  status: string
  adoptionStatus: string
  displayStatus: DrainDisplayStatus
  displayStatusLabel: string
  latitude: number
  longitude: number
  photoUrl: string
  dirtLevel: number
  isRisk: boolean
  aiConfidence: number
  riskRemind: boolean
  riskReportId: number | null
  adoptionBlocked: boolean
}

export async function createDrain(
  request: DrainCreateRequest,
): Promise<DrainCreateResponse> {
  const { latitude, longitude, photoKey, name, address, riskDescription } = request

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error('올바른 위치 정보가 필요해요.')
  }
  if (!photoKey.trim()) {
    throw new Error('빗물받이 사진을 첨부해 주세요.')
  }
  if (name.length > 50 || address.length > 200 || riskDescription.length > 500) {
    throw new Error('이름·주소·위험 설명의 글자 수를 확인해 주세요.')
  }

  const { data: body } = await apiClient.post<
    ApiResponse<DrainCreateResponse | null>
  >('/api/v1/drain', request, { timeout: AI_REQUEST_TIMEOUT_MS })

  if (!body.success || !body.data) {
    throw new Error(body.error?.message ?? '빗물받이 등록에 실패했어요.')
  }

  if (!Number.isSafeInteger(body.data.id) || body.data.id <= 0) {
    throw new Error('등록됐지만 빗물받이 번호를 확인할 수 없어요. 지도를 확인해 주세요.')
  }

  return body.data
}


// GET /api/v1/drain/list — 전체 빗물받이의 검색·페이지 조회
// 검색 응답에는 좌표가 없을 수 있으므로, 선택 시 상세 API를 조회합니다.
export interface DrainSearchItem {
  id: number
  name: string
  address: string | null
  nickname: string | null
}

export interface DrainSearchPage {
  content: DrainSearchItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

type DrainSearchItemDto = {
  drainId?: number
  id?: number // 서버가 id로 반환하는 경우도 호환
  name?: string | null
  address?: string | null
  nickname?: string | null
}

type DrainSearchPageDto = {
  content: DrainSearchItemDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export async function getDrainPage(
  params: {
    q: string
    page?: number
    size?: number
    status?: string
  },
  signal?: AbortSignal,
): Promise<DrainSearchPage> {
  const { q, page = 0, size = 10, status } = params
  const { data: body } = await apiClient.get<
    ApiResponse<DrainSearchPageDto | null>
  >('/api/v1/drain/list', {
    params: {
      q: q.trim(),
      page,
      size,
      ...(status ? { status } : {}),
    },
    signal,
  })

  if (!body.success || !body.data || !Array.isArray(body.data.content)) {
    throw new Error(body.error?.message ?? '빗물받이 검색에 실패했어요.')
  }

  const content = body.data.content.map((item) => {
    const id = item.drainId ?? item.id
    if (!Number.isSafeInteger(id) || !id || id <= 0) {
      throw new Error('검색 결과의 빗물받이 ID가 올바르지 않아요.')
    }

    return {
      id,
      name: item.name?.trim() || `빗물받이 #${id}`,
      address: item.address ?? null,
      nickname: item.nickname ?? null,
    }
  })

  return {
    content,
    page: body.data.page,
    size: body.data.size,
    totalElements: body.data.totalElements,
    totalPages: body.data.totalPages,
    hasNext: body.data.hasNext,
  }
}
