
import { useState } from 'react'

import ModalShell from '../../../components/common/Modalshell'
import type { DrainDetailDto } from '../../../types/drainDetail'

import { AdoptForm, ReleaseForm } from './AdoptionForms'
import { InspectForm } from '../../mydrains/components/ActionForms'

type Action = 'adopt' | 'release' | 'inspect' | 'report'

type Props = {
  drain: DrainDetailDto
  isMine: boolean
}

const TITLES: Record<Action, string> = {
  adopt: '빗물받이 입양하기',
  release: '입양 그만두기',
  inspect: '사진으로 점검 기록',
  report: '빗물받이 제보',
}

export default function DrainActions({
  drain,
  isMine,
}: Props) {
  const [action, setAction] = useState<Action | null>(null)

  const canAdopt =
    drain.status === 'ACTIVE' &&
    drain.adoptionStatus === 'AVAILABLE'

  const isMyAdoption =
    drain.adoptionStatus === 'ADOPTED' && isMine

  const closeModal = () => setAction(null)

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

            <details className="relative mt-3 text-right" onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.open = false
            }}>
              <summary className="inline-flex cursor-pointer list-none items-center rounded-lg px-3 py-2 text-xs font-semibold text-[#78899F] [&::-webkit-details-marker]:hidden">입양 관리 ···</summary>
              <button type="button" onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open')
                setAction('release')
              }} className="absolute right-0 top-full z-10 whitespace-nowrap rounded-xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs font-semibold text-[#C85D5D] shadow-lg">입양 그만두기</button>
            </details>
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => setAction('report')}
        className="w-full rounded-full border border-[#E8EDF5] bg-white p-3 text-xs font-bold text-[#3981F7]"
      >
        이곳을 제보하기
      </button>

      {action && (
        <ModalShell
          title={TITLES[action]}
          onClose={closeModal}
        >
          {action === 'adopt' && <AdoptForm />}

          {action === 'release' && <ReleaseForm />}

          {/* 기존 안내 문구 대신 실제 점검 폼 연결 */}
          {action === 'inspect' &&
            drain.adoption &&
            isMyAdoption && (
              <InspectForm
                drainId={drain.id}
      adoptionName={drain.adoption.nickname}
      onCancel={closeModal}
              />
            )}

          {action === 'report' && (
            <p className="text-xs leading-relaxed text-[#607C99]">
              막힘, 신규 등록, 위치 수정, 삭제 요청,
              악취 등의 제보 기능은 별도 화면에서
              연결할 예정이에요.
            </p>
          )}
        </ModalShell>
      )}
    </>
  )
}
