
import { useState } from 'react'

import ModalShell from '../../../components/common/Modalshell'
import type { DrainDetailDto } from '../../../types/drainDetail'
import type { InspectionRequest } from '../../../types/notifications'

import { AdoptForm, ReleaseForm } from './AdoptionForms'
import { InspectForm } from '../../mydrains/components/ActionForms'
import RainInspectForm from './RainInspectForm'
import ReportDraftModal from '../../map/components/ReportDraftModal'

type Action =
  | 'adopt'
  | 'release'
  | 'inspect'
  | 'rain-inspect'
  | 'report'

type Props = {
  drain: DrainDetailDto
  isMine: boolean
  rainRequest?: InspectionRequest
}

const TITLES: Record<Action, string> = {
  adopt: '빗물받이 입양하기',
  release: '입양 그만두기',
  inspect: '사진으로 점검 기록',
  'rain-inspect': '비 예보 점검 인증',
  report: '빗물받이 제보',
}

export default function DrainActions({
  drain,
  isMine,
  rainRequest,
}: Props) {
  const [action, setAction] =
    useState<Action | null>(null)

  const [dismissedRequestId, setDismissedRequestId] =
    useState<number | null>(null)
  
  const [reportNotice, setReportNotice] = useState('')

  const canAdopt =
    drain.status === 'ACTIVE' &&
    drain.adoptionStatus === 'AVAILABLE'

  const isMyAdoption =
    drain.adoptionStatus === 'ADOPTED' &&
    isMine

  const canUseRainRequest =
    Boolean(rainRequest) &&
    (
      rainRequest?.role === 'CLAIMANT' ||
      (
        rainRequest?.role === 'OWNER' &&
        isMyAdoption
      )
    )

  // 알림함에서 진입한 요청은 자동으로 인증 모달 열기
  // 사용자가 닫은 뒤에는 자동으로 다시 열지 않음
  const autoOpenRain =
    canUseRainRequest &&
    dismissedRequestId !== rainRequest?.requestId &&
    action === null

  const activeAction: Action | null =
    action ?? (autoOpenRain ? 'rain-inspect' : null)

  const closeModal = () => {
    if (rainRequest) {
      setDismissedRequestId(rainRequest.requestId)
    }
    setAction(null)
  }

  if (drain.status === 'REMOVED') {
    return (
      <p className="rounded-xl bg-[#F1F6FB] p-4 text-xs text-[#78899F]">
        삭제 처리된 빗물받이입니다.
      </p>
    )
  }

  return (
    <>
      <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
        <h3 className="mb-3 text-base font-bold text-[#203451]">
          돌봄 정보
        </h3>

        {drain.adoption ? (
          <div className="space-y-2 rounded-2xl bg-[#F4F7FC] p-3 text-xs leading-relaxed text-[#637790]">
            <p>
              {isMyAdoption
                ? '내가 돌보고 있는 또랑이에요.'
                : '현재 입양 중인 빗물받이예요.'}
            </p>

            <p>
              마지막 점검:{' '}
              {drain.adoption.lastManagedAt
                ? new Date(
                    drain.adoption.lastManagedAt,
                  ).toLocaleDateString('ko-KR')
                : '기록 없음'}
            </p>

            <p className="font-bold text-[#203451]">
              다음 점검:{' '}
              {drain.adoption.nextManagementAt
                ? new Date(
                    drain.adoption.nextManagementAt,
                  ).toLocaleDateString('ko-KR')
                : '미정'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#78899F]">
            아직 입양한 집사가 없어요.
          </p>
        )}

        {canAdopt && (
          <button
            type="button"
            onClick={() => setAction('adopt')}
            className="mt-4 min-h-11 w-full rounded-full bg-[#6099E8] p-3 text-xs font-bold text-white"
          >
            이 빗물받이 입양하기
          </button>
        )}

        {isMyAdoption && (
          <>
            <button
              type="button"
              onClick={() => setAction('inspect')}
              className="mt-4 min-h-11 w-full rounded-full bg-[#6099E8] p-3 text-xs font-bold text-white"
            >
              사진으로 점검 기록
            </button>

            <details className="relative mt-3 text-right">
              <summary className="inline-flex cursor-pointer list-none items-center rounded-lg px-3 py-2 text-xs font-semibold text-[#78899F] [&::-webkit-details-marker]:hidden">
                입양 관리 ···
              </summary>

              <button
                type="button"
                onClick={() => setAction('release')}
                className="absolute right-0 top-full z-10 whitespace-nowrap rounded-xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs font-semibold text-[#C85D5D] shadow-lg"
              >
                입양 그만두기
              </button>
            </details>
          </>
        )}

        {canUseRainRequest && rainRequest && (
          <button
            type="button"
            onClick={() => {
              setDismissedRequestId(rainRequest.requestId)
              setAction('rain-inspect')
            }}
            className="mt-3 min-h-11 w-full rounded-full border border-[#B9D7FF] bg-[#EAF2FF] p-3 text-xs font-bold text-[#3981F7]"
          >
            {rainRequest.role === 'CLAIMANT'
              ? '대신 점검 인증하기'
              : '비 예보 점검 인증하기'}
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={() => setAction('report')}
        className="w-full rounded-full border border-[#E8EDF5] bg-white p-3 text-xs font-bold text-[#3981F7]"
      >
        이곳을 제보하기
      </button>
        
{reportNotice && (
  <p
    role="status"
    className="rounded-xl bg-[#E8F7EF] p-3 text-center text-xs font-semibold text-[#259B68]"
  >
    {reportNotice}
  </p>
)}

      {activeAction && activeAction !== 'report' && (
        <ModalShell
          title={
            activeAction === 'rain-inspect' &&
            rainRequest?.role === 'CLAIMANT'
              ? '대신 점검 인증'
              : TITLES[activeAction]
          }
          onClose={closeModal}
        >
          {activeAction === 'adopt' && (
            <AdoptForm
              drainId={drain.id}
              onClose={closeModal}
            />
          )}

          {activeAction === 'release' && (
            <ReleaseForm />
          )}

          {activeAction === 'inspect' &&
            drain.adoption &&
            isMyAdoption && (
              <InspectForm
                adoptionId={drain.adoption.adoptionId}
                drainId={drain.id}
                adoptionName={drain.adoption.nickname}
                onCancel={closeModal}
              />
            )}

          {activeAction === 'rain-inspect' &&
            canUseRainRequest &&
            rainRequest && (
              <RainInspectForm
                key={rainRequest.requestId}
                drainId={drain.id}
                requestId={rainRequest.requestId}
                kind={
                  rainRequest.role === 'CLAIMANT'
                    ? 'SUBSTITUTE'
                    : 'FORECAST'
                }
                adoptionName={
                  drain.adoption?.nickname ||
                  `빗물받이 #${drain.id}`
                }
                onCancel={closeModal}
              />
            )}

        </ModalShell>
      )}
      
{activeAction === 'report' && (
  <ReportDraftModal
    drains={[
      {
        id: drain.id,
        name: `빗물받이 #${drain.id}`,
        nickname: drain.adoption?.nickname ?? null,
      },
    ]}
    initialDrainId={drain.id}
    onClose={closeModal}
    onComplete={(reportId) => {
      closeModal()
      setReportNotice(
        `제보 #${reportId}가 접수됐어요. 관리자 검토를 기다리고 있어요.`,
      )
    }}
  />
)}

    </>
  )
}
