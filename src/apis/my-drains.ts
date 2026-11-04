
import { apiClient } from './axios-instance'
import type {
  MyAdoptionDto,
  MyAdoptionsResponse,
} from '../types/myDrains'

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

// 실제 GET /api/v1/adoptions/me 응답
export interface MyAdoptionApiDto {
  adoptionId: number
  nickname: string
  drainId: number
  level: number
  score: number
  lastManagedAt: string | null
  nextManagementAt: string | null
  releaseWarning: boolean
  missedForecastCount: number
  lonely: boolean
  address?: string | null
  displayStatus?: string | null
  displayStatusLabel?: string | null
  levelTitle?: string | null
  nextLevelScore?: number | null
  progressPercent?: number | null
}

export interface MyAdoptionsApiData {
  count: number
  limit: number
  adoptions: MyAdoptionApiDto[]
}

// 실제 내 입양 목록 조회
export async function getMyAdoptions(
  signal?: AbortSignal,
): Promise<MyAdoptionsApiData> {
  const { data: response } = await apiClient.get<
    ApiResponse<MyAdoptionsApiData>
  >('/api/v1/adoptions/me', {
    signal,
  })

  if (
    !response.success ||
    !response.data ||
    !Array.isArray(response.data.adoptions)
  ) {
    throw new Error(
      response.error?.message ??
        '내 또랑이 목록을 불러오지 못했어요.',
    )
  }

  return response.data
}

// 서버 DTO -> 기존 프론트 UI 타입
function toMyAdoptionDto(
  item: MyAdoptionApiDto,
): MyAdoptionDto {
  return {
    adoption_id: item.adoptionId,
    adoption_name: item.nickname,

    drain: {
      drain_id: item.drainId,
      name:
        item.address?.trim() ||
        `빗물받이 #${item.drainId}`,
      status: item.displayStatus ?? 'ADOPTED',
    },

    level: item.level,
    stage: item.levelTitle || '성장 중',
    xp: item.score,
    next_level_xp: item.nextLevelScore ?? 0,
    progress_percent: item.progressPercent ?? 0,

    last_care_at: item.lastManagedAt ?? '',
    next_inspection_at: item.nextManagementAt ?? '',

    // 점검 쉬기 상태는 별도 API에서 관리
    pause_until: null,

    release_warning: item.releaseWarning,
    missed_forecast_count: item.missedForecastCount,
    lonely: item.lonely,
  }
}

// 현재 MyDrainsPage/DrainCard에서 사용할 형태
export function toMyAdoptionsView(
  data: MyAdoptionsApiData,
): MyAdoptionsResponse {
  return {
    count: data.count,
    limit: data.limit,
    adoptions: data.adoptions.map(toMyAdoptionDto),
  }
}
