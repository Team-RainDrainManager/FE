
import { useContext, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAdoptionDrainDetail,
  getMyAdoptionList,
} from '../../apis/adoptions'
import { getMyRainRequests } from '../../apis/requests'
import { getPauseStatus } from '../../apis/profile-settings'
import { AccountId } from '../../features/missions/wallet'
import { useAuthStore } from '../../store/useAuthStore'

import DrainInfo from './components/DrainInfo'
import DrainPhoto from './components/DrainPhoto'
import DrainGrowth from './components/DrainGrowth'
import DrainActions from './components/DrainActions'
import { getDrainGrowth } from '../../apis/growth'
import InspectionHistory from './components/InspectionHistory'
import AdoptionCare from './components/AdoptionCare'

export default function DrainDetailPage() {
  const queryClient = useQueryClient()
  const accountId = useContext(AccountId)
  const [now, setNow] = useState(() => Date.now())
  const { drainId } = useParams()
  const id = Number(drainId)
  const validId = Number.isInteger(id) && id > 0

  const [searchParams] = useSearchParams()
  const requestedId = searchParams.get('requestId')
  const requestId =
    requestedId === null ? null : Number(requestedId)

  const validRequestId =
    requestId !== null &&
    Number.isSafeInteger(requestId) &&
    requestId > 0

  const accessToken = useAuthStore(
    (state) => state.accessToken,
  )

  const {
    data: drain,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drain-detail', id],
    queryFn: ({ signal }) =>
      getAdoptionDrainDetail(id, signal),
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

  // 현재 점검 요청의 컨텍스트를 별도 캐시에 보관
  // 점검 제출 후 목록이 갱신되어도 인증 폼은 유지됨
  const {
    data: rainRequests,
    isError: rainRequestError,
    isPending: rainRequestPending,
  } = useQuery({
    queryKey: ['rain-inspection-context', requestId],
    queryFn: ({ signal }) =>
      getMyRainRequests(undefined, signal),
    enabled:
      validId &&
      validRequestId &&
      Boolean(accessToken),
    staleTime: 60_000,
    retry: 1,
  })

  // 실제 서버에 존재하며 점검 가능한 요청인지 확인
  const rainRequest = rainRequests?.find(
    (request) =>
      request.requestId === requestId &&
      request.drain.drainId === id &&
      request.availableActions.includes('INSPECT') &&
      (
        request.role === 'OWNER' ||
        request.role === 'CLAIMANT'
      ),
  )

  const adoptionId = drain?.adoption?.adoptionId
  const isMine =
    adoptionId !== undefined &&
    (myAdoptions?.adoptions.some(
      (item) => item.adoptionId === adoptionId,
    ) ?? false)

  const { data: pauseStatus } = useQuery({
    queryKey: ['pause-status', accountId],
    queryFn: getPauseStatus,
    enabled: isMine && accountId !== null,
    staleTime: 30_000,
  })
  const pauseUntil =
    isMine && accountId !== null ? pauseStatus?.activeUntil ?? null : null
  const pauseEndTime = pauseUntil ? new Date(pauseUntil).getTime() : 0
  const activePauseUntil = pauseEndTime > now ? pauseUntil : null

  useEffect(() => {
    if (!(pauseEndTime > now)) return

    const delay = Math.min(60_000, Math.max(0, pauseEndTime - Date.now()))
    const timer = window.setTimeout(() => {
      const currentTime = Date.now()
      setNow(currentTime)

      if (currentTime >= pauseEndTime) {
        void queryClient.invalidateQueries({ queryKey: ['drain-detail', id], exact: true })
        void queryClient.invalidateQueries({ queryKey: ['adoption-detail', adoptionId], exact: true })
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [adoptionId, id, now, pauseEndTime, queryClient])


// 빗물받이 성장 정보 조회
const {
  data: growth,
  isError: growthError,
} = useQuery({
  queryKey: ['drain-growth', id],
  queryFn: ({ signal }) => getDrainGrowth(id, signal),
  enabled:
    validId &&
    Boolean(accessToken) &&
    Boolean(drain?.adoption),
  staleTime: 30_000,
  retry: 1,
})


  if (!validId) {
    return (
      <div className="px-5 py-16 text-center">
        <p>올바르지 않은 빗물받이 번호예요.</p>
        <Link to="/map" className="text-[#3981F7]">
          지도로 돌아가기
        </Link>
      </div>
    )
  }

  if (isPending) {
    return (
      <div
        role="status"
        className="px-5 py-16 text-center text-sm text-[#78899F]"
      >
        빗물받이 정보를 불러오는 중이에요.
      </div>
    )
  }

  if (isError || !drain) {
    return (
      <div className="px-5 py-16 text-center">
        <h2 className="text-base font-bold text-[#203451]">
          빗물받이 정보를 불러오지 못했어요.
        </h2>

        <p className="mt-2 text-xs text-[#78899F]">
          {error instanceof Error
            ? error.message
            : '잠시 후 다시 시도해 주세요.'}
        </p>

        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-full bg-[#6099E8] px-5 py-3 text-xs font-bold text-white"
        >
          다시 시도
        </button>

        <Link
          to="/map"
          className="ml-3 text-xs text-[#3981F7]"
        >
          지도로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] space-y-4 bg-[#F4F7FC] px-4 pb-7 pt-5">
      <div className="overflow-hidden rounded-[24px] border border-[#E8EDF5] bg-white shadow-[0_4px_18px_rgba(23,43,77,0.04)]">
        <DrainInfo drain={drain} />

        
<DrainGrowth
  adoption={drain.adoption}
  growth={growth}
/>

{growthError && drain.adoption && (
  <p
    role="alert"
    className="bg-white px-4 py-3 text-xs text-[#B84D4D]"
  >
    최신 성장 정보를 불러오지 못했어요.
    기본 입양 정보로 표시하고 있어요.
  </p>
)}

      </div>

      {isMine && drain.adoption && (
        <AdoptionCare
          adoptionId={drain.adoption.adoptionId}
          isPaused={activePauseUntil !== null}
        />
      )}

      <DrainPhoto drain={drain} />

      {validRequestId &&
        !rainRequestPending &&
        !rainRequest && (
          <p
            role="alert"
            className="rounded-xl bg-[#FFF4DC] p-3 text-xs text-[#A97822]"
          >
            {rainRequestError
              ? '비 예보 요청 정보를 불러오지 못했어요. 알림함에서 다시 시도해 주세요.'
              : '현재 이 빗물받이에서 진행 가능한 비 예보 점검 요청이 없어요.'}
          </p>
        )}

      
<DrainActions
  drain={drain}
  isMine={isMine}
  activePauseUntil={activePauseUntil}
  rainRequest={rainRequest}
/>

{isMine && drain.adoption && (
  <InspectionHistory
    adoptionId={drain.adoption.adoptionId}
  />
)}

    </div>
  )
}
