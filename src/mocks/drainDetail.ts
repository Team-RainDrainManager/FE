
import type {
  ApiResponse,
  DrainDetailDto,
  DrainGrowthDto,
} from '../types/drainDetail'

// B-2 응답 형식 그대로
export const MOCK_DRAIN_DETAILS: Record<
  number,
  ApiResponse<DrainDetailDto>
> = {
  4: {
    success: true,
    data: {
      id: 4,
      status: 'ACTIVE',
      adoptionStatus: 'ADOPTED',
      latitude: 37.48789,
      longitude: 126.803,
      photoUrl: '',
      dirtLevel: 1,
      adoption: {
        adoptionId: 104,
        nickname: '등굣길 또랑',
        level: 3,
        score: 150,
        adoptedAt: '2026-10-10T10:00:00+09:00',
        lastManagedAt: '2026-10-28T15:30:00+09:00',
        nextManagementAt: '2026-11-11T15:30:00+09:00',
      },
    },
    error: null,
  },

  5: {
    success: true,
    data: {
      id: 5,
      status: 'ACTIVE',
      adoptionStatus: 'ADOPTED',
      latitude: 37.48852,
      longitude: 126.803,
      photoUrl: '',
      dirtLevel: 2,
      adoption: {
        adoptionId: 105,
        nickname: '공원 새싹',
        level: 1,
        score: 75,
        adoptedAt: '2026-09-20T09:00:00+09:00',
        lastManagedAt: '2026-10-01T09:00:00+09:00',
        nextManagementAt: '2026-10-15T09:00:00+09:00',
      },
    },
    error: null,
  },

  7: {
    success: true,
    data: {
      id: 7,
      status: 'ACTIVE',
      adoptionStatus: 'AVAILABLE',
      latitude: 37.48978,
      longitude: 126.803,
      photoUrl: '',
      dirtLevel: 3,
      adoption: null,
    },
    error: null,
  },
}

const MOCK_STAGES = [
  { from_level: 0, name: '돌봄을 기다려요' },
  { from_level: 1, name: '깨끗해지는 중' },
  { from_level: 5, name: '작은 씨앗' },
  { from_level: 10, name: '새싹 또랑' },
  { from_level: 15, name: '튼튼한 지킴이' },
  { from_level: 20, name: '물길 도우미' },
  { from_level: 25, name: '꽃봉오리' },
  { from_level: 30, name: '꽃핀 또랑' },
  { from_level: 35, name: '우리 동네 단짝' },
  { from_level: 40, name: '현장 반장' },
  { from_level: 45, name: '동네 수호자' },
  { from_level: 50, name: '전설의 또랑' },
]

// B-3 응답 형식
export const MOCK_DRAIN_GROWTH: Record<
  number,
  DrainGrowthDto
> = {
  4: {
    level: 3,
    stage: '깨끗해지는 중',
    xp: 150,
    next_level_xp: 50,
    progress_percent: 0,
    max_level: 50,
    stages: MOCK_STAGES,
  },

  5: {
    level: 1,
    stage: '깨끗해지는 중',
    xp: 75,
    next_level_xp: 25,
    progress_percent: 50,
    max_level: 50,
    stages: MOCK_STAGES,
  },
}

// B-6 내 입양 목록으로 확인한다고 가정한 시연용 ID
// 상세 조회(B-2) 응답 자체에는 '내 입양 여부'가 없음
export const MOCK_MY_ADOPTION_IDS = [104, 105]
