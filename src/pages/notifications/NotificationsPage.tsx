import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { getCurrentCoordinates } from '../../apis/adoptions'
import { getErrorMessage } from '../../apis/auth'
import {
  claimRainRequest,
  getMyRainRequests,
  replyRainRequest,
} from '../../apis/requests'
import type { RequestAction } from '../../types/notifications'
import {
  getNotifications,
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../apis/notifications'
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
  const [notificationMessage, setNotificationMessage] = useState('')

  const {
    data: requests = [],
    isPending: requestsPending,
    isError: requestsFailed,
    error: requestsError,
    refetch: refetchRequests,
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

  // 서버에 저장된 알림 메시지는 활동 알림 탭에 모아 표시합니다.
  // 점검 요청 탭에는 별도 API의 실제 점검 요청 카드만 표시합니다.
  const {
    data: notificationPages,
    isPending: notificationsPending,
    isError: notificationsFailed,
    error: notificationsError,
    refetch: refetchNotifications,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications-list'],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      getNotifications({ cursor: pageParam, size: 20 }, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: activeTab === 'activity',
    staleTime: 20_000,
  })

  const {
    data: notificationSummary,
    isError: summaryFailed,
    error: summaryError,
  } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: ({ signal }) => getNotificationSummary(signal),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })

  const notifications = notificationPages?.pages.flatMap(
    (page) => page.notifications,
  ) ?? []

  // 점검 요청 탭 배지는 조치할 요청 수, 활동 알림 탭 배지는
  // 알림 종류와 관계없이 서버에 저장된 미확인 메시지 수를 나타냅니다.
  const totalUnreadCount = notificationSummary?.totalUnread ?? 0

  const invalidateNotificationQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications-summary'] })
  }

  const readOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidateNotificationQueries,
  })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidateNotificationQueries,
  })

  // 현재 라우트에서 확인된 목적지만 연결합니다.
  // requestId로 빗물받이 ID를 알 수 있으면 기존 상세 점검 화면으로 이동합니다.
  const openNotificationDestination = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'RAIN_TOMORROW':
      case 'RAIN_TODAY':
      case 'SUBSTITUTE_OPEN':
      case 'REQUEST_CLAIMED':
      case 'REQUEST_DEADLINE_CHANGED': {
        const request = requests.find(
          (item) => item.requestId === notification.requestId,
        )
        if (request) {
          navigate(`/drains/${request.drain.drainId}?requestId=${request.requestId}`)
          return
        }
        setActiveTab('requests')
        setRequestMessage('해당 요청이 현재 요청 목록에 없어요. 목록을 새로고침해 확인해 주세요.')
        return
      }
      case 'REQUEST_CANCELLED':
      case 'REQUEST_MISSED':
        setActiveTab('requests')
        return
      case 'MANAGEMENT_DUE':
      case 'ADOPTION_WARNING':
      case 'ADOPTION_RELEASED':
      case 'ADOPTION_REGISTERED':
      case 'LEVEL_UP':
      case 'INSPECTION_APPROVED':
        navigate('/my-drains')
        return
      case 'REPORT_RESULT':
        // 내 제보 목록의 정확한 경로가 아직 전달되지 않았으므로 프로필로 이동
        navigate('/profile')
        return
      case 'WELCOME':
        navigate('/my-drains')
        return
      default:
        // 이동 경로가 없는 알림은 읽음 처리만 수행합니다.
        return
    }
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (readOneMutation.isPending || readAllMutation.isPending) return
    setNotificationMessage('')
    try {
      if (!notification.read) {
        await readOneMutation.mutateAsync(notification.notificationId)
      }
      openNotificationDestination(notification)
    } catch (error) {
      setNotificationMessage(getErrorMessage(error))
    }
  }

  const handleMarkAllRead = async () => {
    if (readOneMutation.isPending || readAllMutation.isPending) return
    setNotificationMessage('')
    try {
      const updatedCount = await readAllMutation.mutateAsync()
      setNotificationMessage(`${updatedCount}개의 알림을 읽음 처리했어요.`)
    } catch (error) {
      setNotificationMessage(getErrorMessage(error))
    }
  }

  const renderNotificationList = (items: NotificationItem[]) => (
    <ul className="divide-y divide-[#EDF1F6]">
      {items.map((notification) => (
        <li key={notification.notificationId}>
          <button
            type="button"
            disabled={readOneMutation.isPending || readAllMutation.isPending}
            onClick={() => void handleNotificationClick(notification)}
            aria-label={`${notification.read ? '읽은 알림' : '읽지 않은 알림'}: ${notification.title}. ${notification.body}`}
            className="flex w-full items-start gap-2.5 py-4 text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#3981F7]"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-[#3981F7]'}`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block text-[13px] font-semibold leading-5 ${notification.read ? 'text-[#8C9AB0]' : 'text-[#203451]'}`}>
                {notification.title}
              </span>
              <span className={`mt-1 block whitespace-pre-wrap break-words text-[12px] leading-5 ${notification.read ? 'text-[#A5B1C1]' : 'text-[#53647E]'}`}>
                {notification.body}
              </span>
              <time
                dateTime={notification.createdAt}
                className="mt-2 block text-[10px] text-[#A5B1C1]"
              >
                {formatNotificationDate(notification.createdAt)}
              </time>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  const renderNotificationLoadMore = () => (
    hasNextPage ? (
      <button
        type="button"
        onClick={() => void fetchNextPage()}
        disabled={isFetchingNextPage}
        className="mt-3 min-h-10 w-full rounded-xl bg-[#F0F4F9] text-xs font-semibold text-[#3981F7] disabled:opacity-50"
      >
        {isFetchingNextPage ? '알림 불러오는 중...' : '알림 더 보기'}
      </button>
    ) : null
  )

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
          { id: 'activity', label: '활동 알림', count: totalUnreadCount },
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
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${active ? 'bg-[#3981F7] text-white' : 'bg-[#E0E7F0] text-[#78899F]'}`} aria-label={`${tab.count}개 미확인`}>{tab.count}</span>
            </button>
          )
        })}
      </div>
      {summaryFailed && activeTab === 'activity' && (
        <p role="alert" className="mb-3 text-xs text-[#B84D4D]">
          알림 미확인 수를 불러오지 못했어요: {getErrorMessage(summaryError)}
        </p>
      )}
      {notificationMessage && (
        <p role="status" className="mb-3 text-xs text-[#637790]">
          {notificationMessage}
        </p>
      )}
      <section id="notification-panel-requests" role="tabpanel" aria-labelledby="notification-tab-requests" hidden={activeTab !== 'requests'} tabIndex={0}>

        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void showNearbyAtMyLocation()}
            disabled={locationPending}
            className="min-h-9 rounded-xl bg-[#EAF2FF] px-3 text-xs font-semibold text-[#3981F7] disabled:opacity-50"
          >
            {locationPending ? '위치 확인 중...' : '내 위치 주변 요청 보기'}
          </button>
        </div>
        {coordinates && requests.length > 0 && (<p className="mb-2 text-[11px] text-[#78899F]">현재 위치와 내 또랑이 주변 요청을 함께 표시해요.</p>)}
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
          <div className="flex min-h-[45dvh] items-center justify-center">
            <p className="text-center text-sm text-[#8C9AB0]">
              아직 점검 요청이 없어요.
            </p>
          </div>
        ) : (
          <div>
            {requests.map((request) => (
              <InspectionRequestCard
                key={request.requestId}
                request={request}
                onRespond={handleRespond}
                disabled={respondMutation.isPending}
                busy={respondMutation.isPending && respondMutation.variables?.requestId === request.requestId}
                onViewDrain={(drainId, requestId) =>
                 navigate(`/drains/${drainId}?requestId=${requestId}`)
                }
              />
            ))}
          </div>
        )}
      </section>

      <section id="notification-panel-activity" role="tabpanel" aria-labelledby="notification-tab-activity" hidden={activeTab !== 'activity'} tabIndex={0}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="activity-notifications-title" className="text-sm font-bold text-[#203451]">활동 알림</h2>
          <span className="text-xs text-[#8C9AB0]" aria-live="polite">{totalUnreadCount}개 미확인</span>
        </div>
        {notificationsPending ? (
          <p role="status" className="py-6 text-xs text-[#8C9AB0]">활동 알림을 불러오는 중이에요.</p>
        ) : notificationsFailed ? (
          <div role="alert" className="py-6 text-xs text-[#B84D4D]">
            <p>{getErrorMessage(notificationsError)}</p>
            <button type="button" onClick={() => void refetchNotifications()} className="mt-3 min-h-9 rounded-xl bg-[#EAF2FF] px-3 font-semibold text-[#3981F7]">다시 시도</button>
          </div>
        ) : (
          <>
            {notifications.length > 0 ? (
              renderNotificationList(notifications)
            ) : (
              <p className="py-6 text-xs text-[#8C9AB0]">아직 알림이 없어요.</p>
            )}
            {renderNotificationLoadMore()}
          </>
        )}
        {totalUnreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={readAllMutation.isPending || readOneMutation.isPending}
            className="mt-3 min-h-10 text-xs font-semibold text-[#3981F7] disabled:text-[#A5B1C1]"
          >
            {readAllMutation.isPending ? '읽음 처리 중...' : '모든 알림 읽음 처리'}
          </button>
        )}
      </section>
    </main>
  )
}
