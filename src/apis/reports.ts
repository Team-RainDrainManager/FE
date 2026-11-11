
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

// 제보 종류
export type ReportType =
  | 'BLOCKAGE'
  | 'NEW_DRAIN'
  | 'LOCATION_FIX'
  | 'REMOVAL'
  | 'ODOR'

// 제보 처리 상태
export type ReportStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLEARED'

// 1. 제보 생성 요청
export type CreateReportRequest = {
  drainId?: number
  type: ReportType
  photoKey?: string
  description?: string
  latitude?: number
  longitude?: number
  newLatitude?: number
  newLongitude?: number
}

// 제보 생성 응답
export type CreateReportResponse = {
  reportId: number
}

// 2. 내 제보 목록의 항목
export type ReportSummary = {
  reportId: number
  drainId: number | null
  type: ReportType
  status: ReportStatus
  createdAt: string
}

// 내 제보 목록 응답
export type MyReportsResponse = {
  reports: ReportSummary[]
}

// 3. 제보 상세 응답
export type ReportDetail = {
  reportId: number
  drainId: number | null
  type: ReportType
  description: string | null
  photoUrl: string | null
  latitude: number | null
  longitude: number | null
  newLatitude: number | null
  newLongitude: number | null
  status: ReportStatus
  adminComment: string | null
  resolvedAt: string | null
  clearedAt: string | null
  createdAt: string
}

// =====================================
// POST /api/v1/reports
// 제보 생성
// =====================================
export async function createReport(
  request: CreateReportRequest,
): Promise<CreateReportResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<CreateReportResponse>
  >('/api/v1/reports', request)

  const result = unwrap(body)

  if (
    !Number.isSafeInteger(result.reportId) ||
    result.reportId <= 0
  ) {
    throw new Error('제보 번호를 확인할 수 없어요.')
  }

  return result
}

// =====================================
// GET /api/v1/reports/me
// 내 제보 목록 조회
// =====================================
export async function getMyReports(
  signal?: AbortSignal,
): Promise<MyReportsResponse> {
  const { data: body } = await apiClient.get<
    ApiResponse<MyReportsResponse>
  >('/api/v1/reports/me', { signal })

  const result = unwrap(body)

  if (!Array.isArray(result.reports)) {
    throw new Error(
      '내 제보 목록 응답 형식이 올바르지 않아요.',
    )
  }

  return result
}

// =====================================
// GET /api/v1/reports/{reportId}
// 제보 상세 조회
// =====================================
export async function getReportDetail(
  reportId: number,
  signal?: AbortSignal,
): Promise<ReportDetail> {
  if (
    !Number.isSafeInteger(reportId) ||
    reportId <= 0
  ) {
    throw new Error('올바르지 않은 제보 번호예요.')
  }

  const { data: body } = await apiClient.get<
    ApiResponse<ReportDetail>
  >(`/api/v1/reports/${reportId}`, { signal })

  return unwrap(body)
}
