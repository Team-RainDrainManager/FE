import { apiClient } from './axios-instance'
import type { ReportDetail, ReportType } from './reports'

// 관리자(ADMIN · CITY_OFFICIAL) 전용 API. 권한이 없으면 서버가 403으로 거절합니다.

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: { code: string; message?: string } | null
}

function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === null) {
    throw new Error(body.error?.message ?? '요청을 처리하지 못했어요.')
  }
  return body.data
}

function requireId(id: number, label: string) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`올바르지 않은 ${label} 번호예요.`)
  }
}

// ───────── 제보 ─────────

export type AdminReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLEARED'

export type AdminReportSummary = {
  reportId: number
  drainId: number | null
  type: ReportType
  status: AdminReportStatus
  blocksAdoption: boolean
  createdAt: string
}

export type AdminReportDetail = Omit<ReportDetail, 'status'> & {
  status: AdminReportStatus
  blocksAdoption?: boolean
  clearedAt?: string | null
}

// GET /api/v1/admin/reports : 제보 목록 (status를 보내면 그 상태만)
export async function getAdminReports(
  status: AdminReportStatus | null,
  signal?: AbortSignal,
): Promise<AdminReportSummary[]> {
  const { data: body } = await apiClient.get<
    ApiResponse<{ reports: AdminReportSummary[] }>
  >('/api/v1/admin/reports', {
    params: status ? { status } : undefined,
    signal,
  })
  const result = unwrap(body)
  if (!Array.isArray(result.reports)) {
    throw new Error('제보 목록 응답 형식이 올바르지 않아요.')
  }
  return result.reports
}

// PATCH /api/v1/admin/reports/{reportId} : 제보 승인 · 반려 (반려는 사유 필수)
export async function reviewAdminReport(
  reportId: number,
  approved: boolean,
  adminComment: string,
): Promise<AdminReportDetail> {
  requireId(reportId, '제보')
  const comment = adminComment.trim()
  const { data: body } = await apiClient.patch<ApiResponse<AdminReportDetail>>(
    `/api/v1/admin/reports/${reportId}`,
    { approved, ...(comment ? { adminComment: comment } : {}) },
  )
  return unwrap(body)
}

// PATCH /api/v1/admin/reports/{reportId}/clear : 승인된 막힘 제보의 입양 차단 해제
export async function clearAdminReport(
  reportId: number,
  adminComment: string,
): Promise<AdminReportDetail> {
  requireId(reportId, '제보')
  const comment = adminComment.trim()
  const { data: body } = await apiClient.patch<ApiResponse<AdminReportDetail>>(
    `/api/v1/admin/reports/${reportId}/clear`,
    comment ? { adminComment: comment } : {},
  )
  return unwrap(body)
}

// ───────── 사진 검토 ─────────

export type ReviewType = 'INSPECTION' | 'MANAGEMENT_LOG' | 'CLEANING'

export type AdminReviewItem = {
  type: ReviewType
  id: number
  createdAt: string
  userId: number | null
  nickname: string | null
  drainId: number | null
  drainName: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  beforeGrade: number | null
  afterGrade: number | null
  dirtLevel: number | null
  aiConfidence: number | null
  distanceM: number | null
  locationMismatch: boolean | null
  reason: string | null
}

export type ReviewDecisionResult = {
  type: ReviewType
  id: number
  reviewStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedAt: string | null
  xpAwarded: number | null
}

// GET /api/v1/admin/reviews : 사진 검토 대기 목록 (type을 생략하면 전체)
export async function getAdminReviews(
  type: ReviewType | null,
  signal?: AbortSignal,
): Promise<AdminReviewItem[]> {
  const { data: body } = await apiClient.get<
    ApiResponse<{ reviews: AdminReviewItem[] }>
  >('/api/v1/admin/reviews', {
    params: { ...(type ? { type } : {}), limit: 50 },
    signal,
  })
  const result = unwrap(body)
  if (!Array.isArray(result.reviews)) {
    throw new Error('검토 목록 응답 형식이 올바르지 않아요.')
  }
  return result.reviews
}

// PATCH /api/v1/admin/reviews/{type}/{id} : 사진 검토 승인 · 반려 (반려는 사유 필수)
export async function decideAdminReview(
  type: ReviewType,
  id: number,
  decision: 'APPROVE' | 'REJECT',
  reason: string,
): Promise<ReviewDecisionResult> {
  requireId(id, '검토')
  const text = reason.trim()
  const { data: body } = await apiClient.patch<ApiResponse<ReviewDecisionResult>>(
    `/api/v1/admin/reviews/${type}/${id}`,
    { decision, ...(text ? { reason: text } : {}) },
  )
  return unwrap(body)
}
