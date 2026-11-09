
import { AI_REQUEST_TIMEOUT_MS, apiClient } from './axios-instance'

// 공통 API 응답
type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === null) {
    throw new Error(
      body.error?.message ?? '요청을 처리하지 못했어요.',
    )
  }

  return body.data
}

// 점검 종류
export type InspectionKind =
  | 'ROUTINE'
  | 'FORECAST'
  | 'SUBSTITUTE'

// 점검 상태
export type InspectionStatus =
  | 'NEEDS_CLEANING'
  | 'COMPLETED'
  | 'PENDING'
  | 'REJECTED'

// 점검 시작 요청
export type InspectionStartRequest = {
  drainId: number
  kind: InspectionKind
  requestId?: number
  beforeKey: string
  latitude: number
  longitude: number
  capturedAt: string
  note?: string
  safetyConfirmed: boolean
}

// 점검 결과 응답
export type InspectionSubmitResponse = {
  inspectionId: number
  status: InspectionStatus
  beforeGrade: number | null
  afterGrade: number | null
  confidence: number | null
  distanceM: number | null
  xpAwarded: number
  cleanNotice: string | null
}

// 점검 시작
// 깨끗하면 COMPLETED
// 더러우면 NEEDS_CLEANING
// 위치나 AI 판정 문제가 있으면 PENDING 등이 반환될 수 있음
export async function startInspection(
  request: InspectionStartRequest,
): Promise<InspectionSubmitResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<InspectionSubmitResponse>
  >('/api/v1/inspections', request, { timeout: AI_REQUEST_TIMEOUT_MS })

  const result = unwrap(body)

  if (
    !Number.isSafeInteger(result.inspectionId) ||
    result.inspectionId <= 0
  ) {
    throw new Error(
      '점검 시작 응답에서 inspectionId를 확인할 수 없어요.',
    )
  }

  return result
}

// 청소 후 점검 완료 요청
export type InspectionCompleteRequest = {
  afterKey: string
  safetyConfirmed: boolean
}

// 청소가 필요하다는 판정을 받은 뒤 호출
export async function completeInspection(
  inspectionId: number,
  request: InspectionCompleteRequest,
): Promise<InspectionSubmitResponse> {
  if (!Number.isSafeInteger(inspectionId) || inspectionId <= 0) {
    throw new Error('올바르지 않은 점검 번호예요.')
  }

  const { data: body } = await apiClient.post<
    ApiResponse<InspectionSubmitResponse>
  >(
    `/api/v1/inspections/${inspectionId}/complete`,
    request,
    { timeout: AI_REQUEST_TIMEOUT_MS },
  )

  return unwrap(body)
}


// GET /api/v1/drains/{drainId}/inspection-eligibility
// requestId가 없으면 정기 점검, 있으면 비 예보/대신 점검 자격 확인
// 서버에서 정의한 점검 불가 사유 네 가지입니다.
// 점검이 가능한 경우에는 reason이 null일 수 있습니다.
export type InspectionEligibilityReason =
  | 'SANCTIONED'
  | 'NOT_ASSIGNED'
  | 'REQUEST_CLOSED'
  | 'REPLY_REQUIRED'

export type InspectionEligibilityResponse = {
  eligible: boolean
  reason: InspectionEligibilityReason | null
  message: string
}

// 서버 메시지를 우선 사용하고, 메시지가 없을 때만 사유별 기본 문구를 표시합니다.
const ELIGIBILITY_REASON_MESSAGES: Record<InspectionEligibilityReason, string> = {
  SANCTIONED: '현재 점검이 제한되어 있어요.',
  NOT_ASSIGNED: '이 빗물받이를 점검할 권한이 없어요.',
  REQUEST_CLOSED: '점검 요청이 종료되었어요.',
  REPLY_REQUIRED: '먼저 점검 요청을 수락해 주세요.',
}

export function getInspectionEligibilityMessage(
  result: InspectionEligibilityResponse,
): string {
  if (result.message?.trim()) return result.message.trim()
  if (result.reason && result.reason in ELIGIBILITY_REASON_MESSAGES) {
    return ELIGIBILITY_REASON_MESSAGES[result.reason]
  }
  return result.eligible
    ? '점검할 수 있어요.'
    : '현재 이 빗물받이는 점검할 수 없어요.'
}

export async function getInspectionEligibility(
  drainId: number,
  requestId?: number,
  signal?: AbortSignal,
): Promise<InspectionEligibilityResponse> {
  if (!Number.isSafeInteger(drainId) || drainId <= 0) {
    throw new Error('올바른 빗물받이 번호가 필요해요.')
  }

  if (
    requestId !== undefined &&
    (!Number.isSafeInteger(requestId) || requestId <= 0)
  ) {
    throw new Error('올바른 점검 요청 번호가 필요해요.')
  }

  const { data: body } = await apiClient.get<
    ApiResponse<InspectionEligibilityResponse>
  >(`/api/v1/drains/${drainId}/inspection-eligibility`, {
    ...(requestId !== undefined ? { params: { requestId } } : {}),
    signal,
  })

  const result = unwrap(body)
  if (typeof result.eligible !== 'boolean') {
    throw new Error('점검 가능 여부 응답 형식을 확인할 수 없어요.')
  }

  return result
}

// GET /api/v1/inspections/{inspectionId}
// 점검 본인/해당 입양자/관리자만 조회 가능
export type InspectionDetailResponse = {
  inspectionId: number
  drain: {
    drainId: number
    name: string
  }
  kind: InspectionKind
  createdAt: string
  review: string
  reviewReason: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  beforeGrade: number | null
  afterGrade: number | null
  cleaned: boolean
  distanceM: number | null
  xp: number
  note: string | null
  photoDeleted: boolean
  level: number | null
  displayStatus: string | null
  hasBlockageReport: boolean
}

export async function getInspectionDetail(
  inspectionId: number,
  signal?: AbortSignal,
): Promise<InspectionDetailResponse> {
  if (!Number.isSafeInteger(inspectionId) || inspectionId <= 0) {
    throw new Error('올바른 점검 기록 번호가 필요해요.')
  }

  const { data: body } = await apiClient.get<
    ApiResponse<InspectionDetailResponse>
  >(`/api/v1/inspections/${inspectionId}`, { signal })

  return unwrap(body)
}
