
import type { ReleaseReason } from './drainDetail'

// B-6: 내 입양 목록 조회
export interface MyAdoptionDto {
  adoption_id: number
  adoption_name: string

  drain: {
    drain_id: number
    name: string
    status: string
  }

  level: number
  stage: string
  xp: number
  next_level_xp: number
  progress_percent: number

  last_care_at: string
  next_inspection_at: string
  pause_until: string | null
  release_warning: boolean
  missed_forecast_count: number
  lonely: boolean
}

export interface MyAdoptionsResponse {
  count: number
  limit: number
  adoptions: MyAdoptionDto[]
}

// A-10: 점검 쉬기 상태
export interface MyPauseStatus {
  can_apply: boolean
  active_until: string | null
  next_available_at: string | null
}

// B-5: 입양 해제 요청
export interface ReleaseAdoptionRequest {
  reason: ReleaseReason
  note?: string
}

export type DrainModalType =
  | { type: 'growth'; drainId: number | null }
  | { type: 'preview'; drainId: number | null; level: number }
  | { type: 'inspect'; drainId: number }
  | { type: 'release'; drainId: number }
  | { type: 'pause' }

export type PageModal = DrainModalType | null
