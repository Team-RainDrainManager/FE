
import { apiClient } from './axios-instance'

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
  >('/api/v1/inspections', request)

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
  )

  return unwrap(body)
}
