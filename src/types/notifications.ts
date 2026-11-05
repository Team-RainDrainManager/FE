// 종료 상태 enum 전체가 확인되지 않아 state는 서버 문자열을 그대로 받습니다.
export type InspectionRequestStatus = string
export type InspectionRequestRole = 'OWNER' | 'CLAIMANT' | 'NEARBY'

export interface InspectionRequest {
  requestId: number
  drain: {
    drainId: number
    name: string | null
    latitude: number
    longitude: number
    level?: number | null // 현재 목록 API에는 제공되지 않음; 다른 UI 데이터에서는 사용 가능
  }
  state: InspectionRequestStatus
  role: InspectionRequestRole
  rainStartAt: string
  replyDeadlineAt: string
  deadlineAt: string
  remainingMinutes: number | null
  distanceM: number | null
  availableActions: ('REPLY' | 'CLAIM' | 'INSPECT')[]
}

export type RequestAction = 'accept' | 'decline' | 'claim'

export interface ActivityNotification {
  notificationId: number
  text: string
  createdAt: string
  read: boolean
}

export interface ActivityNotificationPage {
  unreadCount: number
  nextCursor: number | null
  notifications: ActivityNotification[]
}
