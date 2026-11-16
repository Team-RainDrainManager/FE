import { apiClient } from './axios-instance'
import type { ApiEnvelope } from './auth'

export const BUG_REPORT_CATEGORIES = {
  UI: '화면·디자인 오류',
  ERROR: '오류·멈춤',
  FEATURE: '기능 동작 오류',
  PERFORMANCE: '속도 저하',
  OTHER: '기타',
}

export const BUG_REPORT_STATUSES = {
  RECEIVED: '접수',
  IN_PROGRESS: '확인 중',
  RESOLVED: '해결',
  WONT_FIX: '보류',
}

export const MY_BUG_REPORTS_QUERY_KEY = ['my-bug-reports'] as const
export const BUG_REPORT_CONTENT_MIN = 10
export const BUG_REPORT_CONTENT_MAX = 2000

export type BugReportCategory = keyof typeof BUG_REPORT_CATEGORIES
export type BugReportStatus = keyof typeof BUG_REPORT_STATUSES

export type BugReportSummary = {
  bugReportId: number
  category: BugReportCategory
  title: string
  content: string
  status: BugReportStatus
  createdAt: string
  resolvedAt?: string | null
  reporterNickname?: string | null
}

export type BugReportPage = {
  content: BugReportSummary[]
  page: number
  totalPages: number
  hasNext: boolean
}

export type AdminBugReportDetail = BugReportSummary & {
  screen: string | null
  requestId: string | null
  appVersion: string | null
  platform: 'WEB' | 'IOS' | 'ANDROID' | null
  userAgent: string | null
  photoUrls: string[]
  adminNote: string | null
  resolvedByNickname: string | null
}

export type BugReportUpdate = {
  status?: BugReportStatus
  adminNote?: string
}

type CreateBugReportRequest = {
  category: BugReportCategory
  title: string
  content: string
}

type CreateBugReportResponse = {
  bugReportId: number
  status: 'RECEIVED'
  createdAt: string
}

function unwrap<T>(body: ApiEnvelope<T | null>, fallback: string): T {
  if (!body?.success || body.data == null) {
    throw new Error(body?.error?.message || body?.error?.reason || fallback)
  }
  return body.data
}

function unwrapPage(body: ApiEnvelope<BugReportPage | null>, fallback: string): BugReportPage {
  const result = unwrap(body, fallback)
  if (!Array.isArray(result.content)) {
    throw new Error('버그 신고 목록을 확인할 수 없어요.')
  }
  return result
}

export async function createBugReport(
  request: CreateBugReportRequest,
): Promise<CreateBugReportResponse> {
  const { data: body } = await apiClient.post<ApiEnvelope<CreateBugReportResponse | null>>(
    '/api/v1/bug-reports',
    request,
  )

  const result = unwrap(body, '버그 신고를 접수하지 못했어요.')
  if (!Number.isSafeInteger(result.bugReportId) || result.bugReportId <= 0) {
    throw new Error('신고 접수 번호를 확인할 수 없어요.')
  }

  return result
}

export async function getMyBugReports(page: number, signal?: AbortSignal): Promise<BugReportPage> {
  const { data: body } = await apiClient.get<ApiEnvelope<BugReportPage | null>>(
    '/api/v1/bug-reports/me',
    { params: { page, size: 20 }, signal },
  )
  return unwrapPage(body, '내 버그 신고 내역을 불러오지 못했어요.')
}

const ADMIN_BUG_REPORTS_PATH = '/api/v1/admin/bug-reports'

export async function getAdminBugReports(page: number, signal?: AbortSignal): Promise<BugReportPage> {
  const { data: body } = await apiClient.get<ApiEnvelope<BugReportPage | null>>(
    ADMIN_BUG_REPORTS_PATH,
    { params: { page, size: 20 }, signal },
  )
  return unwrapPage(body, '버그 신고 목록을 불러오지 못했어요.')
}

export async function getAdminBugReport(id: number, signal?: AbortSignal): Promise<AdminBugReportDetail> {
  const { data: body } = await apiClient.get<ApiEnvelope<AdminBugReportDetail | null>>(
    `${ADMIN_BUG_REPORTS_PATH}/${id}`,
    { signal },
  )
  return unwrap(body, '버그 신고 상세를 불러오지 못했어요.')
}

export async function updateAdminBugReport(id: number, request: BugReportUpdate): Promise<AdminBugReportDetail> {
  const { data: body } = await apiClient.patch<ApiEnvelope<AdminBugReportDetail | null>>(
    `${ADMIN_BUG_REPORTS_PATH}/${id}`,
    request,
  )
  return unwrap(body, '버그 신고 처리 상태를 저장하지 못했어요.')
}
