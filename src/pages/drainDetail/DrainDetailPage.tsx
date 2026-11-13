import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAdoptionDrainDetail, getMyAdoptionList } from '../../apis/adoptions'
import { getDrainGrowth } from '../../apis/growth'
import { getPauseStatus } from '../../apis/profile-settings'
import { getMyRainRequests } from '../../apis/requests'
import { useAuthStore } from '../../store/useAuthStore'

import AdoptionCare from './components/AdoptionCare'
import DrainActions from './components/DrainActions'
import DrainGrowth from './components/DrainGrowth'
import DrainInfo from './components/DrainInfo'
import DrainPhoto from './components/DrainPhoto'
import InspectionHistory from './components/InspectionHistory'

const STATUS_LABELS = {
  ACTIVE: '등록 완료',
  PENDING: '등록 대기',
  REMOVED: '삭제 처리',
} as const

const BADGE_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold'

export default function DrainDetailPage() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [now, setNow] = useState(() => Date.now())
  const { drainId } = useParams()
  const [searchParams] = useSearchParams()

  const id = Number(drainId)
  const validId = Number.isSafeInteger(id) && id > 0
  const requestId = Number(searchParams.get('requestId'))
  const validRequestId = Number.isSafeInteger(requestId) && requestId > 0

  const {
    data: drain,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drain-detail', id],
    queryFn: ({ signal }) => getAdoptionDrainDetail(id, signal),
    enabled: validId,
    staleTime: 30_000,
    retry: 1,
  })

  const { data: myAdoptions } = useQuery({
    queryKey: ['my-adoptions'],
    queryFn: getMyAdoptionList,
    enabled: Boolean(accessToken),
    staleTime: 30_000,
    retry: 1,
  })

  const {
    data: rainRequests,
    isError: rainRequestError,
    isPending: rainRequestPending,
  } = useQuery({
    queryKey: ['rain-inspection-context', requestId],
    queryFn: ({ signal }) => getMyRainRequests(undefined, signal),
    enabled: validId && validRequestId && Boolean(accessToken),
    staleTime: 60_000,
    retry: 1,
  })

  const rainRequest = rainRequests?.find(
    (request) =>
      request.requestId === requestId &&
      request.drain.drainId === id &&
      request.availableActions.includes('INSPECT') &&
      (request.role === 'OWNER' || request.role === 'CLAIMANT'),
  )

  const adoptionId = drain?.adoption?.adoptionId
  const isMine =
    Boolean(accessToken) &&
    adoptionId !== undefined &&
    (myAdoptions?.adoptions.some((item) => item.adoptionId === adoptionId) ?? false)

  const { data: pauseStatus } = useQuery({
    queryKey: ['pause-status', adoptionId],
    queryFn: getPauseStatus,
    enabled: isMine,
    staleTime: 30_000,
  })

  const pauseUntil = isMine ? (pauseStatus?.activeUntil ?? null) : null
  const pauseEndTime = pauseUntil ? new Date(pauseUntil).getTime() : 0
  const activePauseUntil = pauseEndTime > now ? pauseUntil : null

  useEffect(() => {
    if (!(pauseEndTime > now)) return

    const delay = Math.min(60_000, Math.max(0, pauseEndTime - Date.now()))
    const timer = window.setTimeout(() => {
      const currentTime = Date.now()
      setNow(currentTime)

      if (currentTime >= pauseEndTime) {
        void queryClient.invalidateQueries({
          queryKey: ['drain-detail', id],
          exact: true,
        })
        void queryClient.invalidateQueries({
          queryKey: ['adoption-detail', adoptionId],
          exact: true,
        })
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [adoptionId, id, now, pauseEndTime, queryClient])

  const { data: growth, isError: growthError } = useQuery({
    queryKey: ['drain-growth', id],
    queryFn: ({ signal }) => getDrainGrowth(id, signal),
    enabled: validId && Boolean(accessToken) && Boolean(drain?.adoption),
    staleTime: 30_000,
    retry: 1,
  })

  if (!validId) {
    return (
      <div className="px-5 py-16 text-center">
        <p>올바르지 않은 빗물받이 번호예요.</p>
        <Link to="/map" className="text-[#276C9B]">지도로 돌아가기</Link>
      </div>
    )
  }

  if (isPending) {
    return (
      <div role="status" className="px-5 py-16 text-center text-sm text-[#536A7A]">
        빗물받이 정보를 불러오는 중이에요.
      </div>
    )
  }

  if (isError || !drain) {
    return (
      <div className="px-5 py-16 text-center">
        <h2 className="text-base font-bold text-[#17344C]">
          빗물받이 정보를 불러오지 못했어요.
        </h2>
        <p className="mt-2 text-xs text-[#536A7A]">
          {error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-full bg-[#276C9B] px-5 py-3 text-xs font-bold text-white"
        >
          다시 시도
        </button>
        <Link to="/map" className="ml-3 text-xs text-[#276C9B]">
          지도로 돌아가기
        </Link>
      </div>
    )
  }

  const adoption = drain.adoption
  const adopted = drain.adoptionStatus === 'ADOPTED'
  const showActionBar = isMine && adopted && drain.status !== 'REMOVED'

  const actions = (
    <DrainActions key={drain.id} drain={drain} isMine={isMine} rainRequest={rainRequest} />
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F5F9FC]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[18px] pt-[21px] pb-6">
        <section
          aria-label="또랑이 정보"
          className="mb-[17px] flex flex-wrap items-start justify-between gap-x-3 gap-y-2"
        >
          <div className="min-w-0 flex-[1_1_8rem]">
            {isMine && (
              <p className="mb-1.5 text-xs font-bold text-[#536A7A]">
                내가 돌보는 또랑이
              </p>
            )}
            <h2 className="text-[29px] leading-[1.23] font-extrabold tracking-tight text-[#17344C] [overflow-wrap:anywhere]">
              {adoption?.nickname || '빗물받이'}
            </h2>
          </div>

          <div className="flex max-w-full flex-wrap gap-1.5">
            <span
              className={`${BADGE_CLASS} ${
                adopted ? 'bg-[#E9F6EF] text-[#24765A]' : 'bg-[#EEF4FA] text-[#536A7A]'
              }`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {adopted ? '입양 중' : '미입양'}
            </span>
            <span
              className={`${BADGE_CLASS} ${
                drain.status === 'ACTIVE'
                  ? 'bg-[#E9F6EF] text-[#24765A]'
                  : 'bg-[#EEF4FA] text-[#536A7A]'
              }`}
            >
              {STATUS_LABELS[drain.status]}
            </span>
          </div>
        </section>

        <DrainGrowth adoption={adoption} growth={growth} />

        {growthError && adoption && (
          <p role="alert" className="mt-2 text-xs text-[#B84D4D]">
            최신 성장 정보를 불러오지 못했어요. 기본 입양 정보로 표시하고 있어요.
          </p>
        )}

        {isMine && adoption && (
          <AdoptionCare
            key={adoption.adoptionId}
            adoptionId={adoption.adoptionId}
            activePauseUntil={activePauseUntil}
            nextManagementAt={adoption.nextManagementAt}
            lastManagedAt={adoption.lastManagedAt}
          />
        )}

        <DrainInfo drain={drain} />

        <div className="mt-6">
          <DrainPhoto drain={drain} />
        </div>

        {validRequestId && !rainRequestPending && !rainRequest && (
          <p role="alert" className="mt-4 rounded-xl bg-[#FFF4DC] p-3 text-xs text-[#8A6510]">
            {rainRequestError
              ? '비 예보 요청 정보를 불러오지 못했어요. 알림함에서 다시 시도해 주세요.'
              : '현재 이 빗물받이에서 진행 가능한 비 예보 점검 요청이 없어요.'}
          </p>
        )}

        {isMine && adoption && (
          <div className="mt-6">
            <InspectionHistory key={adoption.adoptionId} adoptionId={adoption.adoptionId} />
          </div>
        )}

        {!showActionBar && <div className="mt-4">{actions}</div>}
      </div>

      {showActionBar && (
  <footer className="shrink-0 border-t border-[#DFEBF3] bg-[#F5F9FC] px-[18px] pt-3 pb-[max(12px,env(safe-area-inset-bottom,0px))]">
    {actions}
  </footer>
)}
    </div>
  )
}