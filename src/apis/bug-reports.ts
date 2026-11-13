import { apiClient } from './axios-instance'
import type { ApiEnvelope } from './auth'

export type BugReportCategory = 'ERROR' | 'UI' | 'FEATURE' | 'PERFORMANCE' | 'OTHER'

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

export async function createBugReport(
  request: CreateBugReportRequest,
): Promise<CreateBugReportResponse> {
  const { data: body } = await apiClient.post<ApiEnvelope<CreateBugReportResponse | null>>(
    '/api/v1/bug-reports',
    request,
  )

  if (!body?.success || !body.data) {
    throw new Error(body?.error?.message || body?.error?.reason || '버그 신고를 접수하지 못했어요.')
  }

  if (!Number.isSafeInteger(body.data.bugReportId) || body.data.bugReportId <= 0) {
    throw new Error('신고 접수 번호를 확인할 수 없어요.')
  }

  return body.data
}
