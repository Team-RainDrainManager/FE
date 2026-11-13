import { useState } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'

import { getCurrentCoordinates } from '../../../apis/adoptions'
import { getErrorMessage } from '../../../apis/auth'
import { claimRainRequest, getMyRainRequests, type Coordinates } from '../../../apis/requests'
import ModalShell from '../../../components/common/Modalshell'
import type { InspectionRequest, RequestAction } from '../../../types/notifications'
import InspectionRequestCard from '../../notifications/components/InspectionRequestCard'

type Props = {
  requestId: number | null
  initialCoordinates: Coordinates | null
  onClose: () => void
}

const CLAIM_KEY = ['claim-rain-request']

export default function NearbyRequestSheet({
  requestId,
  initialCoordinates,
  onClose,
}: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [coordinates, setCoordinates] = useState(initialCoordinates)

  const requestsQuery = useQuery({
    queryKey: ['rain-requests', coordinates?.latitude ?? null, coordinates?.longitude ?? null],
    queryFn: ({ signal }) => getMyRainRequests(coordinates ?? undefined, signal),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })

  const locate = useMutation({
    mutationFn: getCurrentCoordinates,
    onSuccess: (position) => {
      setCoordinates(position)
      void queryClient.invalidateQueries({
        queryKey: ['rain-requests', position.latitude, position.longitude],
        exact: true,
      })
    },
  })

  const claim = useMutation({
    mutationKey: CLAIM_KEY,
    mutationFn: async (request: InspectionRequest) => {
      const position = await getCurrentCoordinates()
      return claimRainRequest(request.requestId, position)
    },
    onSettled: async (_result, _error, request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rain-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
        queryClient.invalidateQueries({ queryKey: ['rain-notice'] }),
        queryClient.invalidateQueries({ queryKey: ['drain-detail', request.drain.drainId] }),
        queryClient.invalidateQueries({ queryKey: ['rain-inspection-context', request.requestId] }),
      ])
    },
  })
  const isClaiming = useIsMutating({ mutationKey: CLAIM_KEY }) > 0

  const requests = requestsQuery.data ?? []
  const nearbyRequests = requests.filter(
    (request) =>
      request.role === 'NEARBY' &&
      (requestId === null || request.requestId === requestId) &&
      request.requestId !== claim.data?.requestId,
  )
  const myRequest = requests.find(
    (request) =>
      request.requestId === requestId &&
      (request.role === 'OWNER' || request.role === 'CLAIMANT'),
  )

  function handleRespond(id: number, action: RequestAction) {
    if (action !== 'claim' || locate.isPending || queryClient.isMutating({ mutationKey: CLAIM_KEY })) return
    const request = nearbyRequests.find((item) => item.requestId === id)
    if (request?.availableActions.includes('CLAIM')) claim.mutate(request)
  }

  return (
    <ModalShell title={requestId === null ? '주변 점검 요청' : '도움 요청'} onClose={onClose}>
      <p className="text-xs leading-5 text-[#637790]">
        빗물받이에서 300m 이내에 있을 때 대신 점검을 맡을 수 있어요.
      </p>
      <button
        type="button"
        onClick={() => locate.mutate()}
        disabled={locate.isPending || isClaiming}
        aria-busy={locate.isPending}
        className="mt-2 min-h-11 rounded-xl bg-[#EAF2FF] px-3 text-xs font-bold text-[#3981F7] disabled:opacity-50"
      >
        {locate.isPending ? '위치 확인 중…' : '내 위치 기준으로 찾기'}
      </button>
      {locate.isError && (
        <p role="alert" className="mt-2 text-xs text-[var(--dd-ink)]">
          {getErrorMessage(locate.error)}
        </p>
      )}
      {claim.isError && (
        <p role="alert" className="mt-3 rounded-xl bg-[var(--dd-subtle)] p-3 text-xs text-[var(--dd-ink)]">
          {getErrorMessage(claim.error)}
        </p>
      )}
      {claim.data && (
        <div className="mt-3 rounded-xl bg-[var(--dd-subtle)] px-3 pt-3 text-sm text-[var(--dd-ink)]">
          <p role="status" className="font-bold">대신 점검을 맡았어요.</p>
          <Link
            to={`/notifications?requestId=${claim.data.requestId}`}
            className="inline-flex min-h-11 items-center text-xs font-bold text-[#3981F7]"
          >
            맡은 점검 보기 ›
          </Link>
        </div>
      )}
      {requestsQuery.isPending ? (
        <p role="status" className="py-5 text-sm text-[#637790]">주변 요청을 불러오는 중이에요.</p>
      ) : requestsQuery.isError ? (
        <div className="py-4 text-sm">
          <p role="alert">{getErrorMessage(requestsQuery.error)}</p>
          <button
            type="button"
            onClick={() => void requestsQuery.refetch()}
            className="min-h-11 text-xs font-bold text-[#3981F7]"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {nearbyRequests.map((request) => (
            <InspectionRequestCard
              key={request.requestId}
              request={request}
              disabled={isClaiming || locate.isPending}
              busy={claim.isPending && claim.variables?.requestId === request.requestId}
              onRespond={handleRespond}
              onViewDrain={(drainId, id) => navigate(`/drains/${drainId}?requestId=${id}`)}
            />
          ))}
          {nearbyRequests.length === 0 && !claim.data && (
            <div className="py-4 text-sm leading-6 text-[#637790]">
              {myRequest ? (
                <Link
                  to={`/notifications?requestId=${myRequest.requestId}`}
                  className="inline-flex min-h-11 items-center font-bold text-[#3981F7]"
                >
                  내 점검 요청에서 보기 ›
                </Link>
              ) : (
                <p>
                  {requestId === null
                    ? '지금 조회된 주변 요청이 없어요.'
                    : '선택한 요청을 현재 주변 목록에서 찾을 수 없어요.'}
                  {coordinates === null && ' 내 위치를 확인하면 내 위치 주변 요청도 볼 수 있어요.'}
                </p>
              )}
            </div>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-1 min-h-11 w-full rounded-xl border border-[var(--dd-line)] text-sm font-bold text-[var(--dd-ink)]"
      >
        닫기
      </button>
    </ModalShell>
  )
}
