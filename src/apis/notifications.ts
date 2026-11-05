import { apiClient } from './axios-instance'

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
    throw new Error(body.error?.message ?? '알림 요청을 처리하지 못했어요.')
  }
  return body.data
}

export type NotificationItem = {
  notificationId: number
  type: string
  category: string
  title: string
  body: string
  createdAt: string
  read: boolean
  requestId: number | null
  adoptionId: number | null
}

export type NotificationPage = {
  unreadCount: number
  nextCursor: number | null
  notifications: NotificationItem[]
}

export type NotificationSummary = {
  totalUnread: number
  requestUnread: number
  activityUnread: number
}

export type NotificationListParams = {
  unread?: boolean
  cursor?: number | null
  size?: number
}

// GET /api/v1/notifications : 최신순 커서 페이지 조회
export async function getNotifications(
  { unread = false, cursor = null, size = 20 }: NotificationListParams = {},
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const { data: body } = await apiClient.get<ApiResponse<NotificationPage>>(
    '/api/v1/notifications',
    {
      params: {
        unread,
        size: Math.min(50, Math.max(1, Math.trunc(size))),
        ...(cursor !== null ? { cursor } : {}),
      },
      signal,
    },
  )

  const page = unwrap(body)
  if (!Array.isArray(page.notifications)) {
    throw new Error('알림 목록 응답 형식이 올바르지 않아요.')
  }
  return page
}

// GET /api/v1/notifications/summary : 탭별 미확인 수
export async function getNotificationSummary(
  signal?: AbortSignal,
): Promise<NotificationSummary> {
  const { data: body } = await apiClient.get<ApiResponse<NotificationSummary>>(
    '/api/v1/notifications/summary',
    { signal },
  )
  return unwrap(body)
}

// PATCH /api/v1/notifications/{notificationId}/read : 개별 읽음
export async function markNotificationRead(
  notificationId: number,
): Promise<void> {
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    throw new Error('올바르지 않은 알림 번호예요.')
  }

  const { data: body } = await apiClient.patch<ApiResponse<string>>(
    `/api/v1/notifications/${notificationId}/read`,
  )
  // 이 API는 성공 data가 문자열(또는 null)일 수 있으므로 success만 검사합니다.
  if (!body.success) {
    throw new Error(body.error?.message ?? '알림을 읽음 처리하지 못했어요.')
  }
}

// PATCH /api/v1/notifications/read-all : 모든 유형의 알림 읽음
export async function markAllNotificationsRead(): Promise<number> {
  const { data: body } = await apiClient.patch<
    ApiResponse<{ updatedCount: number }>
  >('/api/v1/notifications/read-all')

  return unwrap(body).updatedCount
}
