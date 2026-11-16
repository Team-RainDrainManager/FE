import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import ModalShell from '../../../components/common/Modalshell'
import type { DrainDetailDto } from '../../../types/drainDetail'
import type { InspectionRequest } from '../../../types/notifications'

import { InspectForm } from '../../mydrains/components/ActionForms'
import { AdoptForm } from './AdoptionForms'
import RainInspectForm from './RainInspectForm'

type Action =
  | { type: 'adopt' | 'inspect' }
  | { type: 'rain-inspect'; request: InspectionRequest }

type Props = {
  drain: DrainDetailDto
  isMine: boolean
  rainRequest?: InspectionRequest
}

const TITLES: Record<Action['type'], string> = {
  adopt: '빗물받이 입양하기',
  inspect: '사진으로 점검 기록',
  'rain-inspect': '비 예보 점검 인증',
}

export default function DrainActions({ drain, isMine, rainRequest }: Props) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const [dismissedRequestId, setDismissedRequestId] = useState<number | null>(null)

  const adoption = drain.adoption
  const canAdopt = drain.status === 'ACTIVE' && drain.adoptionStatus === 'AVAILABLE'
  const isMyAdoption = drain.adoptionStatus === 'ADOPTED' && isMine
  const canUseRainRequest =
    rainRequest?.role === 'CLAIMANT' ||
    (rainRequest?.role === 'OWNER' && isMyAdoption)
  const availableRainRequest = canUseRainRequest ? rainRequest : undefined

  // 요청 목록이 갱신되어도 이미 열린 점검 폼과 결과는 유지합니다.
  if (!action && availableRainRequest && dismissedRequestId !== availableRainRequest.requestId) {
    setAction({ type: 'rain-inspect', request: availableRainRequest })
  }

  function closeModal() {
    const request = action?.type === 'rain-inspect' ? action.request : availableRainRequest
    if (request) setDismissedRequestId(request.requestId)
    setAction(null)
    if (action?.type === 'rain-inspect') {
      void queryClient.invalidateQueries({
        queryKey: ['rain-inspection-context', action.request.requestId],
      })
    }
  }

  if (drain.status === 'REMOVED') {
    return (
      <p className="rounded-xl bg-[#F1F6FB] p-4 text-xs text-[#637790]">
        삭제 처리된 빗물받이입니다.
      </p>
    )
  }

  return (
    <>
      <section
        aria-label="빗물받이 관리"
        className={
          isMyAdoption
            ? 'w-full'
            : 'rounded-[22px] border border-[#DFEBF3] bg-[var(--dd-surface)] p-4'
        }
      >
        {isMyAdoption ? (
          <button
            type="button"
            onClick={() => setAction({ type: 'inspect' })}
            className="flex min-h-[51px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#276C9B] px-3 text-[15px] font-extrabold text-white shadow-[0_7px_17px_rgba(39,108,155,0.2)] [html[data-dd-theme=dark]_&]:bg-[#2b61a3]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-[19px] shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            점검 시작하기
          </button>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">돌봄 정보</h3>
            {adoption ? (
              <div className="space-y-2 rounded-2xl bg-[#F4F7FC] p-3 text-xs leading-5 text-[#637790]">
                <p>현재 입양 중인 빗물받이예요.</p>
                <p>
                  마지막 점검:{' '}
                  {adoption.lastManagedAt
                    ? new Date(adoption.lastManagedAt).toLocaleDateString('ko-KR')
                    : '기록 없음'}
                </p>
                <p>
                  다음 점검:{' '}
                  {adoption.nextManagementAt
                    ? new Date(adoption.nextManagementAt).toLocaleDateString('ko-KR')
                    : '미정'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#637790]">아직 입양한 집사가 없어요.</p>
            )}
          </>
        )}

        {canAdopt && (
          <button
            type="button"
            onClick={() => setAction({ type: 'adopt' })}
            className="mt-4 min-h-11 w-full rounded-xl bg-[#276C9B] px-3 text-sm font-bold text-white [html[data-dd-theme=dark]_&]:bg-[#2b61a3]"
          >
            이 빗물받이 입양하기
          </button>
        )}

        {availableRainRequest && (
          <button
            type="button"
            onClick={() => setAction({ type: 'rain-inspect', request: availableRainRequest })}
            className="mt-3 min-h-11 w-full rounded-xl border border-[#B9D7FF] [html[data-dd-theme=dark]_&]:border-[var(--dd-line)] bg-[#E6F3FD] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-3 text-xs font-bold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]"
          >
            {availableRainRequest.role === 'CLAIMANT' ? '대신 점검 인증하기' : '비 예보 점검 인증하기'}
          </button>
        )}
      </section>

      {action && (
        <ModalShell
          title={
            action.type === 'rain-inspect' && action.request.role === 'CLAIMANT'
              ? '대신 점검 인증'
              : TITLES[action.type]
          }
          onClose={closeModal}
        >
          {action.type === 'adopt' && (
            <AdoptForm drainId={drain.id} onClose={closeModal} />
          )}

          {action.type === 'inspect' && adoption && isMyAdoption && (
            <InspectForm
              adoptionId={adoption.adoptionId}
              drainId={drain.id}
              adoptionName={adoption.nickname}
              onCancel={closeModal}
            />
          )}

          {action.type === 'rain-inspect' && (
            <RainInspectForm
              key={action.request.requestId}
              drainId={drain.id}
              requestId={action.request.requestId}
              kind={action.request.role === 'CLAIMANT' ? 'SUBSTITUTE' : 'FORECAST'}
              adoptionName={adoption?.nickname || '빗물받이'}
              onCancel={closeModal}
            />
          )}
        </ModalShell>
      )}
    </>
  )
}
