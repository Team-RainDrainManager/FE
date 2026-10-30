
export type DrainRegistrationStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'REMOVED'

export type DrainAdoptionStatus =
  | 'AVAILABLE'
  | 'ADOPTED'

export interface DrainAdoption {
  adoptionId: number
  nickname: string
  level: number
  score: number
  adoptedAt: string
  lastManagedAt: string | null
  nextManagementAt: string | null
}

// B-2: GET /api/v1/drain/{drainId}
export interface DrainDetailDto {
  id: number
  status: DrainRegistrationStatus
  adoptionStatus: DrainAdoptionStatus
  latitude: number
  longitude: number
  photoUrl: string
  dirtLevel: number
  adoption: DrainAdoption | null
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

// B-3: GET /api/drains/{drain_id}/growth
export interface DrainGrowthDto {
  level: number
  stage: string
  xp: number
  next_level_xp: number
  progress_percent: number
  max_level: number
  stages: {
    from_level: number
    name: string
  }[]
}

export type ReleaseReason =
  | 'MOVED'
  | 'NO_TIME'
  | 'OTHER'
