import { useState } from 'react'
import { useNavigate } from 'react-router'


import { sortInspectionRequests } from '../../mocks/notifications'

import type { InspectionRequest, RequestAction } from '../../types/notifications'

import InspectionRequestCard from './components/InspectionRequestCard'

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  // 시연용 카운트: 새로고침하면 초기화되며 실제 일일 제한은 서버에서 검증합니다.
  const [claimCount, setClaimCount] = useState(0)
  const [requestMessage, setRequestMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests')

  const [requests, setRequests] = useState<InspectionRequest[]>([])

  const [notifications, setNotifications] = useState<{ notificationId: number; text: string; createdAt: string; read: boolean }[]>([])

  const markRead = (id: number) => {
    setNotifications((previous) => previous.map((item) =>
      item.notificationId === id ? { ...item, read: true } : item,
    ))
  }

  const markAllRead = () => {
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })))
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length

  const handleRespond = (requestId: number, action: RequestAction) => {
    const target = requests.find((request) => request.requestId === requestId)
    const requiredAction = action === 'claim' ? 'CLAIM' : 'REPLY'
    if (!target?.availableActions.includes(requiredAction)) return
    if (action === 'claim' && claimCount >= 3) {
      setRequestMessage('오늘 대신 점검 가능한 횟수를 모두 사용했어요.')
      return
    }
    // 목데이터에서는 현재 위치 검증과 선착순 처리가 성공했다고 가정합니다.
    // 실제 연동 시 claim 바디에 현재 latitude/longitude를 보내고 서버 오류를 처리하세요.
    if (action === 'claim') setClaimCount((count) => count + 1)
    setRequestMessage(action === 'decline' ? '주변에 요청을 공개했어요. 불이익은 없어요.' :
      action === 'claim' ? '대신 점검을 맡았어요. 입양권은 이동하지 않아요.' : '점검 예정으로 변경했어요.')
    setRequests((previous) => sortInspectionRequests(previous.map((request) => {
      if (request.requestId !== requestId) return request
      const requiredAction = action === 'claim' ? 'CLAIM' : 'REPLY'
      if (!request.availableActions.includes(requiredAction)) return request

      // 응답 후에는 응답 마감 대신 완료 마감까지 남은 시간을 표시합니다.
      const remainingMinutes = request.remainingMinutes === null ? null :
        Math.max(0, request.remainingMinutes + (requiredAction === 'REPLY'
          ? Math.round((Date.parse(request.deadlineAt) - Date.parse(request.replyDeadlineAt)) / 60000)
          : 0))

      if (action === 'decline') {
        return { ...request, state: 'OPEN', remainingMinutes, availableActions: [] }
      }
      return {
        ...request,
        state: action === 'claim' ? 'CLAIMED' : 'ACCEPTED',
        role: action === 'claim' ? 'CLAIMANT' as const : request.role,
        remainingMinutes,
        availableActions: ['INSPECT'] as InspectionRequest['availableActions'],
      }
    })))
  }

  return (
    <main className="min-h-[calc(100dvh-128px)] bg-white px-[18px] pb-8 pt-2">
      <div role="tablist" aria-label="알림 종류" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#F0F4F9] p-1">
        {([
          { id: 'requests', label: '점검 요청', count: requests.length },
          { id: 'activity', label: '활동 알림', count: unreadCount },
        ] as const).map((tab, index) => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} id={`notification-tab-${tab.id}`} type="button" role="tab" aria-selected={active} aria-controls={`notification-panel-${tab.id}`} tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let target: 'requests' | 'activity' | null = null
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') target = index === 0 ? 'activity' : 'requests'
                if (event.key === 'Home') target = 'requests'
                if (event.key === 'End') target = 'activity'
                if (target) {
                  event.preventDefault()
                  setActiveTab(target)
                  document.getElementById(`notification-tab-${target}`)?.focus()
                }
              }}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#3981F7] ${active ? 'border-[#C6DCFF] bg-white text-[#3981F7]' : 'border-transparent text-[#78899F]'}`}>
              {tab.label}
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${active ? 'bg-[#3981F7] text-white' : 'bg-[#E0E7F0] text-[#78899F]'}`} aria-label={tab.id === 'activity' ? `${tab.count}개 미확인` : `${tab.count}건`}>{tab.count}</span>
            </button>
          )
        })}
      </div>
      <section id="notification-panel-requests" role="tabpanel" aria-labelledby="notification-tab-requests" hidden={activeTab !== 'requests'} tabIndex={0}>

        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="inspection-requests-title" className="text-sm font-bold text-[#203451]">비 예보 점검 요청</h2>
          <span className="text-xs text-[#8C9AB0]">{requests.length}건</span>
        </div>
        {requestMessage && <p role="status" className="mb-3 text-xs leading-5 text-[#637790]">{requestMessage}</p>}
        {requests.length === 0 ? (
          <p className="py-6 text-xs text-[#8C9AB0]">아직 점검 요청이 없어요.</p>
        ) : (
          <div>
            {requests.map((request) => (
              <InspectionRequestCard key={request.requestId} request={request} onRespond={handleRespond} onViewDrain={(drainId) => navigate(`/drains/${drainId}`)} />
            ))}
          </div>
        )}
      </section>

      <section id="notification-panel-activity" role="tabpanel" aria-labelledby="notification-tab-activity" hidden={activeTab !== 'activity'} tabIndex={0}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="activity-notifications-title" className="text-sm font-bold text-[#203451]">활동 알림</h2>
          <span className="text-xs text-[#8C9AB0]" aria-live="polite">{unreadCount}개 미확인</span>
        </div>
        {notifications.length === 0 ? (
          <p className="py-6 text-xs text-[#8C9AB0]">아직 활동 알림이 없어요.</p>
        ) : (
          <ul className="divide-y divide-[#EDF1F6]">
            {notifications.map((notification) => (
              <li key={notification.notificationId}>
                <button type="button" onClick={() => markRead(notification.notificationId)} aria-label={`${notification.read ? '읽은 알림' : '읽지 않은 알림'}: ${notification.text}`} className="flex w-full items-start gap-2.5 py-4 text-left focus-visible:outline-2 focus-visible:outline-[#3981F7]">
                  <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-[#3981F7]'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] leading-5 ${notification.read ? 'text-[#8C9AB0]' : 'text-[#53647E]'}`}>{notification.text}</span>
                    <time dateTime={notification.createdAt} className="mt-2 block text-[10px] text-[#A5B1C1]">{formatNotificationDate(notification.createdAt)}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {notifications.length > 0 && (
          <button type="button" onClick={markAllRead} disabled={unreadCount === 0} className="mt-2 min-h-10 text-xs font-semibold text-[#3981F7] disabled:text-[#A5B1C1]">모두 확인</button>
        )}
      </section>
    </main>
  )
}
