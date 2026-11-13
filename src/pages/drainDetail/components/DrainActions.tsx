import { useState } from 'react'

import ModalShell from '../../../components/common/Modalshell'
import type { DrainDetailDto } from '../../../types/drainDetail'
import type { InspectionRequest } from '../../../types/notifications'

import { InspectForm } from '../../mydrains/components/ActionForms'
import { AdoptForm } from './AdoptionForms'
import RainInspectForm from './RainInspectForm'

type Action = 'adopt' | 'inspect' | 'rain-inspect'

type Props = {
  drain: DrainDetailDto
  isMine: boolean
  rainRequest?: InspectionRequest
}

const TITLES: Record<Action, string> = {
  adopt: '빗물받이 입양하기',
  inspect: '사진으로 점검 기록',
  'rain-inspect': '비 예보 점검 인증',
}

export default function DrainActions({ drain, isMine, rainRequest }: Props) {
  const [action, setAction] = useState<Action | null>(null)
  const [dismissedRequestId, setDismissedRequestId] = useState<number | null>(null)

  const adoption = drain.adoption
  const canAdopt = drain.status === 'ACTIVE' && drain.adoptionStatus === 'AVAILABLE'
  const isMyAdoption = drain.adoptionStatus === 'ADOPTED' && isMine
  const canUseRainRequest =
    rainRequest?.role === 'CLAIMANT' ||
    (rainRequest?.role === 'OWNER' && isMyAdoption)
  const autoOpenRain =
    canUseRainRequest && dismissedRequestId !== rainRequest?.requestId
  const activeAction = action ?? (autoOpenRain ? 'rain-inspect' : null)

  function closeModal() {
    if (rainRequest) setDismissedRequestId(rainRequest.requestId)
    setAction(null)
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
            onClick={() => setAction('inspect')}
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
            onClick={() => setAction('adopt')}
            className="mt-4 min-h-11 w-full rounded-xl bg-[#276C9B] px-3 text-sm font-bold text-white [html[data-dd-theme=dark]_&]:bg-[#2b61a3]"
          >
            이 빗물받이 입양하기
          </button>
        )}

        {canUseRainRequest && rainRequest && (
          <button
            type="button"
            onClick={() => {
              setDismissedRequestId(rainRequest.requestId)
              setAction('rain-inspect')
            }}
            className="mt-3 min-h-11 w-full rounded-xl border border-[#B9D7FF] [html[data-dd-theme=dark]_&]:border-[var(--dd-line)] bg-[#E6F3FD] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-3 text-xs font-bold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]"
          >
            {rainRequest.role === 'CLAIMANT' ? '대신 점검 인증하기' : '비 예보 점검 인증하기'}
          </button>
        )}
      </section>

      {activeAction && (
        <ModalShell
          title={
            activeAction === 'rain-inspect' && rainRequest?.role === 'CLAIMANT'
              ? '대신 점검 인증'
              : TITLES[activeAction]
          }
          onClose={closeModal}
        >
          {activeAction === 'adopt' && (
            <AdoptForm drainId={drain.id} onClose={closeModal} />
          )}

          {activeAction === 'inspect' && adoption && isMyAdoption && (
            <InspectForm
              adoptionId={adoption.adoptionId}
              drainId={drain.id}
              adoptionName={adoption.nickname}
              onCancel={closeModal}
            />
          )}

          {activeAction === 'rain-inspect' && canUseRainRequest && rainRequest && (
            <RainInspectForm
              key={rainRequest.requestId}
              drainId={drain.id}
              requestId={rainRequest.requestId}
              kind={rainRequest.role === 'CLAIMANT' ? 'SUBSTITUTE' : 'FORECAST'}
              adoptionName={adoption?.nickname || '빗물받이'}
              onCancel={closeModal}
            />
          )}
        </ModalShell>
      )}
    </>
  )
}
