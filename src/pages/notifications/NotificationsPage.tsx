import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { getCurrentCoordinates } from '../../apis/adoptions'
import { getErrorMessage } from '../../apis/auth'
import {
  claimRainRequest,
  getMyRainRequests,
  replyRainRequest,
} from '../../apis/requests'
import type {
  ActivityNotification,
  RequestAction,
} from '../../types/notifications'
import type { Coordinates } from '../../apis/requests'

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
  const queryClient = useQueryClient()
  const [requestMessage, setRequestMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [locationError, setLocationError] = useState('')

  const {
    data: requests = [],
    isPending: requestsPending,
    isError: requestsFailed,
    error: requestsError,
    refetch: refetchRequests,
    isFetching: refreshing,
  } = useQuery({
    queryKey: ['rain-requests', coordinates?.latitude ?? null, coordinates?.longitude ?? null],
    queryFn: ({ signal }) => getMyRainRequests(coordinates ?? undefined, signal),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })

  type RequestMutationInput = { requestId: number; action: RequestAction }
  const respondMutation = useMutation({
    mutationFn: async ({ requestId, action }: RequestMutationInput) => {
      if (action === 'claim') {
        // 대신 점검은 반드시 현재 GPS 위치를 서버에 전송합니다.
        const current = await getCurrentCoordinates()
        return claimRainRequest(requestId, current)
      }
      return replyRainRequest(requestId, action === 'accept' ? 'ACCEPT' : 'DECLINE')
    },
    onSuccess: async (_result, { action }) => {
      await queryClient.invalidateQueries({ queryKey: ['rain-requests'] })
      setRequestMessage(
        action === 'claim'
          ? '대신 점검을 맡았어요. 입양권은 이동하지 않아요.'
          : action === 'decline'
            ? '주변에 대신 점검 요청을 공개했어요. 불이익은 없어요.'
            : '점검 가능으로 응답했어요. 마감 전에 점검해 주세요.',
      )
    },
    onError: (error) => setRequestMessage(getErrorMessage(error)),
  })

  // 활동 알림은 별도의 조회 API 연동 전까지 빈 목록을 유지합니다.
  const [notifications, setNotifications] = useState<ActivityNotification[]>([])

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
    if (respondMutation.isPending) return
    const target = requests.find((request) => request.requestId === requestId)
    const requiredAction = action === 'claim' ? 'CLAIM' : 'REPLY'
    if (!target?.availableActions.includes(requiredAction)) return
    setRequestMessage('')
    respondMutation.mutate({ requestId, action })
  }

  const showNearbyAtMyLocation = async () => {
    if (locationPending) return
    setLocationPending(true)
    setLocationError('')
    try {
      const current = await getCurrentCoordinates()
      // GET 파라미터: 위도와 경도를 함께 전달해야 합니다.
      setCoordinates(current)
    } catch (error) {
      setLocationError(`${getErrorMessage(error)} 내 또랑이 주변 요청은 계속 볼 수 있어요.`)
    } finally {
      setLocationPending(false)
    }
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
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void showNearbyAtMyLocation()}
            disabled={locationPending}
            className="min-h-9 rounded-xl bg-[#EAF2FF] px-3 text-xs font-semibold text-[#3981F7] disabled:opacity-50"
          >
            {locationPending ? '위치 확인 중...' : '내 위치 주변 요청 보기'}
          </button>
          <button
            type="button"
            onClick={() => void refetchRequests()}
            disabled={refreshing}
            className="min-h-9 rounded-xl border border-[#E3EAF4] px-3 text-xs font-semibold text-[#78899F] disabled:opacity-50"
          >
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
        {coordinates && <p className="mb-2 text-[11px] text-[#78899F]">현재 위치와 내 또랑이 주변 요청을 함께 표시해요.</p>}
        {locationError && <p role="alert" className="mb-3 text-xs text-[#B84D4D]">{locationError}</p>}
        {requestMessage && <p role="status" className="mb-3 text-xs leading-5 text-[#637790]">{requestMessage}</p>}
        {requestsPending ? (
          <p role="status" className="py-6 text-xs text-[#8C9AB0]">점검 요청을 불러오는 중이에요.</p>
        ) : requestsFailed ? (
          <div role="alert" className="py-6 text-xs text-[#B84D4D]">
            <p>{getErrorMessage(requestsError)}</p>
            <button type="button" onClick={() => void refetchRequests()} className="mt-3 min-h-9 rounded-xl bg-[#EAF2FF] px-3 font-semibold text-[#3981F7]">다시 시도</button>
          </div>
        ) : requests.length === 0 ? (
          <p className="py-6 text-xs text-[#8C9AB0]">아직 점검 요청이 없어요.</p>
        ) : (
          <div>
            {requests.map((request) => (
              <InspectionRequestCard
                key={request.requestId}
                request={request}
                onRespond={handleRespond}
                disabled={respondMutation.isPending}
                busy={respondMutation.isPending && respondMutation.variables?.requestId === request.requestId}
                onViewDrain={(drainId) => navigate(`/drains/${drainId}`)}
              />
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
