
import { apiClient } from './axios-instance'
import type { DrainGrowthDto } from '../types/drainDetail'

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

// Swagger 응답
export type GrowthApiResponse = {
  level: number
  score: number
  nextLevelScore: number
  progressPercent: number
}

// 기존 프론트 성장 단계 표시용 데이터
// 성장 단계 이름은 서버 응답이 아니라 앱의 UI 규칙
const STAGES = [
  { from_level: 0, name: '돌봄을 기다려요' },
  { from_level: 1, name: '깨끗해지는 중' },
  { from_level: 5, name: '작은 씨앗' },
  { from_level: 10, name: '새싹 또랑' },
  { from_level: 15, name: '튼튼한 지킴이' },
  { from_level: 20, name: '물길 도우미' },
  { from_level: 25, name: '꽃봉오리' },
  { from_level: 30, name: '꽃핀 또랑' },
  { from_level: 35, name: '깨끗한 물길' },
  { from_level: 40, name: '마을 지킴이' },
  { from_level: 45, name: '또랑이 히어로' },
  { from_level: 50, name: '전설의 또랑' },
]

function getStageName(level: number): string {
  return (
    [...STAGES]
      .reverse()
      .find((stage) => level >= stage.from_level)
      ?.name ?? '성장 중'
  )
}

// 실제 성장 정보 조회
export async function getDrainGrowth(
  drainId: number,
  signal?: AbortSignal,
): Promise<DrainGrowthDto> {
  const { data: body } = await apiClient.get<
    ApiResponse<GrowthApiResponse>
  >(
    `/api/v1/drain/${drainId}/growth`,
    { signal },
  )

  if (!body.success || !body.data) {
    throw new Error(
      body.error?.message ??
        '성장 정보를 불러오지 못했어요.',
    )
  }

  const growth = body.data

  // 서버의 실제 레벨·점수·진행률을
  // 기존 DrainGrowth 컴포넌트 타입으로 변환
  return {
    level: growth.level,
    stage: getStageName(growth.level),
    xp: growth.score,
    next_level_xp: growth.nextLevelScore,
    progress_percent: growth.progressPercent,
    max_level: 50,
    stages: STAGES,
  }
}
