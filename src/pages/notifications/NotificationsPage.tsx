import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'

import { getErrorMessage } from '../../apis/auth'
import { getMyRainRequests, replyRainRequest } from '../../apis/requests'
import type { RequestAction } from '../../types/notifications'
import {
  getNotifications,
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../apis/notifications'
import { formatKstDateTime } from '../../utils/kstDateTime'

import InspectionRequestCard from './components/InspectionRequestCard'
import PushOptInCard from '../../features/push/PushOptInCard'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const queryClient = useQueryClient()
  const requestId = Number(new URLSearchParams(search).get('requestId'))
  const focusedRequestId = Number.isSafeInteger(requestId) && requestId > 0 ? requestId : null
  const [requestMessage, setRequestMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests')
  const [notificationMessage, setNotificationMessage] = useState('')

  const {
    data: requests = [],
    isPending: requestsPending,
    isFetching: requestsFetching,
    isError: requestsFailed,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['rain-requests', null, null],
    queryFn: ({ signal }) => getMyRainRequests(undefined, signal),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })

  const myRequests = requests.filter(
    (request) => request.role === 'OWNER' || request.role === 'CLAIMANT',
  )
  const focusedRequest = myRequests.find((request) => request.requestId === focusedRequestId)
  const displayedRequests = focusedRequest
    ? [focusedRequest, ...myRequests.filter((request) => request.requestId !== focusedRequestId)]
    : myRequests

  type RequestMutationInput = {
    requestId: number
    drainId: number
    action: Exclude<RequestAction, 'claim'>
  }
  const respondMutation = useMutation({
    mutationFn: ({ requestId, action }: RequestMutationInput) =>
      replyRainRequest(requestId, action === 'accept' ? 'ACCEPT' : 'DECLINE'),
    onSuccess: async (_result, { requestId, drainId, action }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rain-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
        queryClient.invalidateQueries({ queryKey: ['rain-notice'] }),
        queryClient.invalidateQueries({ queryKey: ['drain-detail', drainId] }),
        queryClient.invalidateQueries({ queryKey: ['rain-inspection-context', requestId] }),
      ])
      setRequestMessage(
        action === 'decline'
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

  // 점검 요청 탭 배지는 내 요청 목록의 건수, 활동 알림 탭 배지는
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
      case 'SUBSTITUTE_OPEN':
        navigate(`/map?nearby=${notification.requestId ?? 'all'}`)
        return
      case 'RAIN_TOMORROW':
      case 'RAIN_TODAY':
      case 'REQUEST_CLAIMED':
      case 'REQUEST_DEADLINE_CHANGED': {
        if (notification.requestId === null) {
          navigate('/map?nearby=all')
          return
        }
        const request = requests.find(
          (item) => item.requestId === notification.requestId,
        )
        if (request?.role === 'NEARBY') {
          navigate(`/map?nearby=${request.requestId}`)
          return
        }
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
        // 프로필의 내 제보 내역을 바로 펼쳐 보여 줍니다.
        navigate('/profile', { state: { openReports: true } })
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
    <ul className="divide-y divide-[#edf2f8] overflow-hidden rounded-[22px] border border-[#dfe6f3] bg-white px-3.5 [html[data-dd-theme=dark]_&]:divide-[#354962] [html[data-dd-theme=dark]_&]:border-[#354962] [html[data-dd-theme=dark]_&]:bg-[#182638]">
      {items.map((notification) => (
        <li key={notification.notificationId}>
          <button
            type="button"
            disabled={readOneMutation.isPending || readAllMutation.isPending}
            onClick={() => void handleNotificationClick(notification)}
            aria-label={`${notification.read ? '읽은 알림' : '읽지 않은 알림'}: ${notification.title}. ${notification.body}`}
            className="flex w-full items-start gap-2.5 py-4 text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#338CF0]"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-[#338CF0] [html[data-dd-theme=dark]_&]:bg-[#9bcaff]'}`}
            />
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] font-semibold leading-5 ${notification.read ? 'text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]' : 'text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]'}`}>
                {notification.title}
              </span>
              <span className={`mt-1 block whitespace-pre-wrap break-words text-[14px] leading-5 ${notification.read ? 'text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]' : 'text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]'}`}>
                {notification.body}
              </span>
              <time
                dateTime={notification.createdAt}
                className="mt-2 block text-[12px] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]"
              >
                {formatKstDateTime(notification.createdAt) ?? '시각 정보 없음'}
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
        className="mt-3 min-h-11 w-full rounded-xl bg-[#eaf0f7] text-[13px] [html[data-dd-theme=dark]_&]:bg-[#263c56] font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff] disabled:opacity-50"
      >
        {isFetchingNextPage ? '알림 불러오는 중...' : '알림 더 보기'}
      </button>
    ) : null
  )

  const handleRespond = (requestId: number, action: RequestAction) => {
    if (action === 'claim' || respondMutation.isPending) return
    const target = myRequests.find((request) => request.requestId === requestId)
    if (!target?.availableActions.includes('REPLY')) return
    setRequestMessage('')
    respondMutation.mutate({ requestId, drainId: target.drain.drainId, action })
  }

  return (
    <main className="min-h-[calc(100dvh-128px)] bg-[#f2f5fc] px-[18px] pb-8 pt-2 text-[#193454] [html[data-dd-theme=dark]_&]:bg-[#101c2b] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
      <PushOptInCard className="mb-4" />
      <div role="tablist" aria-label="알림 종류" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#eaf0f7] p-1 [html[data-dd-theme=dark]_&]:bg-[#263c56]">
        {([
          { id: 'requests', label: '점검 요청', count: myRequests.length },
          { id: 'activity', label: '활동 알림', count: totalUnreadCount },
        ] as const).map((tab, index) => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} id={`notification-tab-${tab.id}`} type="button" role="tab" aria-selected={active} aria-controls={`notification-panel-${tab.id}`} tabIndex={active ? 0 : -1}
              aria-label={tab.id === 'requests' ? `점검 요청 ${tab.count}건` : `활동 알림 ${tab.count}개 미확인`}
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
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#338CF0] ${active ? 'border-[#C6DCFF] bg-white text-[#338CF0] [html[data-dd-theme=dark]_&]:border-[#354962] [html[data-dd-theme=dark]_&]:bg-[#182638] [html[data-dd-theme=dark]_&]:text-[#9bcaff]' : 'border-transparent text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]'}`}>
              {tab.label}
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[13px] ${active ? 'bg-[#338CF0] text-white' : 'bg-[#eaf0ff] [html[data-dd-theme=dark]_&]:bg-[#283f5b] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]'}`} aria-hidden="true">{tab.count}</span>
            </button>
          )
        })}
      </div>
      {summaryFailed && activeTab === 'activity' && (
        <p role="alert" className="mb-3 text-[13px] text-[#B84D4D] [html[data-dd-theme=dark]_&]:text-[#ffa3a3]">
          알림 미확인 수를 불러오지 못했어요: {getErrorMessage(summaryError)}
        </p>
      )}
      {notificationMessage && (
        <p role="status" className="mb-3 text-[13px] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">
          {notificationMessage}
        </p>
      )}
      <section id="notification-panel-requests" role="tabpanel" aria-labelledby="notification-tab-requests" hidden={activeTab !== 'requests'} tabIndex={0}>
        {requestMessage && <p role="status" className="mb-3 text-[13px] leading-5 text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">{requestMessage}</p>}
        {focusedRequestId !== null && !focusedRequest && !requestsPending && !requestsFetching && !requestsFailed && (
          <p role="status" className="mb-3 text-[13px] leading-5 text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">
            해당 점검 요청이 현재 목록에 없어요.
          </p>
        )}
        {requestsPending ? (
          <p role="status" className="py-6 text-[13px] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">점검 요청을 불러오는 중이에요.</p>
        ) : requestsFailed ? (
          <div role="alert" className="py-6 text-[13px] text-[#B84D4D] [html[data-dd-theme=dark]_&]:text-[#ffa3a3]">
            <p>{getErrorMessage(requestsError)}</p>
            <button type="button" onClick={() => void refetchRequests()} className="mt-3 min-h-11 rounded-xl bg-[#eaf0ff] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-3 font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">다시 시도</button>
          </div>
        ) : myRequests.length === 0 ? (
          <div className="flex min-h-[45dvh] items-center justify-center">
            <div className="text-center">
              <p className="text-[15px] font-bold text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">아직 점검 요청이 없어요.</p>
              <p className="mt-1.5 text-[14px] leading-6 text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">내 또랑이의 점검 요청과 내가 맡은 대신 점검이 여기에 표시돼요.</p>
              <Link to="/map?nearby=all" className="mt-2 inline-flex min-h-11 items-center px-3 text-[13px] font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">
                지도에서 주변 요청 보기
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {displayedRequests.map((request) => (
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
          <h2 id="activity-notifications-title" className="text-[15px] font-bold text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">활동 알림</h2>
          <span className="text-[13px] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]" aria-live="polite">{totalUnreadCount}개 미확인</span>
        </div>
        {notificationsPending ? (
          <p role="status" className="py-6 text-[13px] text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">활동 알림을 불러오는 중이에요.</p>
        ) : notificationsFailed ? (
          <div role="alert" className="py-6 text-[13px] text-[#B84D4D] [html[data-dd-theme=dark]_&]:text-[#ffa3a3]">
            <p>{getErrorMessage(notificationsError)}</p>
            <button type="button" onClick={() => void refetchNotifications()} className="mt-3 min-h-11 rounded-xl bg-[#eaf0ff] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-3 font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">다시 시도</button>
          </div>
        ) : (
          <>
            {notifications.length > 0 ? (
              renderNotificationList(notifications)
            ) : (
              <p className="py-6 text-[14px] leading-6 text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">아직 알림이 없어요. 입양·점검·제보 결과가 여기에 쌓여요.</p>
            )}
            {renderNotificationLoadMore()}
          </>
        )}
        {totalUnreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={readAllMutation.isPending || readOneMutation.isPending}
            className="mt-3 min-h-11 text-[13px] font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff] disabled:text-[#A5B1C1]"
          >
            {readAllMutation.isPending ? '읽음 처리 중...' : '모든 알림 읽음 처리'}
          </button>
        )}
      </section>
    </main>
  )
}
