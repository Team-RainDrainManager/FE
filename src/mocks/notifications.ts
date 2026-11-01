import type { InspectionRequest, ActivityNotification } from '../types/notifications'

// 고정된 시연 시점 기준 데이터입니다. 실제 시계나 API를 사용하지 않습니다.
export const MOCK_INSPECTION_REQUESTS: InspectionRequest[] = [
  {
    requestId: 1,
    drain: { drainId: 4, name: '등굣길 또랑', latitude: 37.485, longitude: 126.803, level: 3 },
    state: 'SENT',
    role: 'OWNER',
    rainStartAt: '2026-11-02T15:00:00+09:00',
    replyDeadlineAt: '2026-11-02T12:00:00+09:00',
    deadlineAt: '2026-11-02T20:00:00+09:00',
    remainingMinutes: 360,
    distanceM: null,
    availableActions: ['REPLY', 'INSPECT'],
  },
  {
    requestId: 2,
    drain: { drainId: 5, name: '공원 새싹', latitude: 37.486, longitude: 126.804, level: 1 },
    state: 'ACCEPTED',
    role: 'OWNER',
    rainStartAt: '2026-11-02T15:00:00+09:00',
    replyDeadlineAt: '2026-11-02T12:00:00+09:00',
    deadlineAt: '2026-11-02T20:00:00+09:00',
    remainingMinutes: 840,
    distanceM: null,
    availableActions: ['INSPECT'],
  },
  {
    requestId: 3,
    drain: { drainId: 6, name: null, latitude: 37.487, longitude: 126.805, level: null },
    state: 'OPEN',
    role: 'NEARBY',
    rainStartAt: '2026-11-02T15:00:00+09:00',
    replyDeadlineAt: '2026-11-02T12:00:00+09:00',
    deadlineAt: '2026-11-02T20:00:00+09:00',
    remainingMinutes: 840,
    distanceM: null, // 위치 미전송: 내 또랑이 근처의 요청도 수락할 수 있습니다.
    availableActions: ['CLAIM'],
  },
]

// API가 정렬한 순서를 목데이터의 상태 변경 후에도 재현합니다.
export function sortInspectionRequests(requests: InspectionRequest[]) {
  return [...requests].sort((a, b) => {
    const aFinished = a.remainingMinutes === null
    const bFinished = b.remainingMinutes === null
    if (aFinished !== bFinished) return aFinished ? 1 : -1
    if (aFinished) return Date.parse(b.deadlineAt) - Date.parse(a.deadlineAt)
    return (a.remainingMinutes ?? 0) - (b.remainingMinutes ?? 0)
  })
}

export const MOCK_ACTIVITY_NOTIFICATIONS: ActivityNotification[] = [
  { notificationId: 1, text: '등굣길 또랑이가 Lv.3이 되었어요.', createdAt: '2026-11-01T10:30:00+09:00', read: false },
  { notificationId: 2, text: '공원 새싹의 정기 점검이 승인되었어요.', createdAt: '2026-11-01T09:00:00+09:00', read: false },
  { notificationId: 3, text: '막힘 제보 검토가 완료되었어요.', createdAt: '2026-10-31T15:20:00+09:00', read: false },
  { notificationId: 4, text: '등굣길 또랑이의 집사가 되었어요.', createdAt: '2026-10-30T11:15:00+09:00', read: true },
  { notificationId: 5, text: '또랑에 오신 걸 환영해요! 우리 동네 물길을 함께 돌봐주세요.', createdAt: '2026-10-29T13:00:00+09:00', read: true },
]
