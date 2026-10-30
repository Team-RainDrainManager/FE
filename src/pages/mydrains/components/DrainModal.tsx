
import ModalShell from '../../../components/common/Modalshell'

import type {
  DrainModalType,
  MyAdoptionDto,
  MyPauseStatus,
  ReleaseAdoptionRequest,
} from '../../../types/myDrains'

import {
  formatCareDate,
  isPauseActive,
} from '../utils'

import {
  InspectForm,
  ReleaseForm,
} from './ActionForms'

import GrowthCatalog, {
  GrowthPreview,
} from './GrowthCatalog'

type Props = {
  modal: DrainModalType
  adoptions: MyAdoptionDto[]
  pauseStatus: MyPauseStatus
  onOpen: (modal: DrainModalType) => void
  onClose: () => void
  onRelease: (
    adoptionId: number,
    payload: ReleaseAdoptionRequest,
  ) => void
  onApplyPause: () => void
}

const TITLES: Record<DrainModalType['type'], string> = {
  growth: '빗물받이별 성장 도감',
  preview: '성장 모습 미리보기',
  inspect: '사진으로 점검 기록',
  release: '입양 그만두기',
  pause: '점검 쉬기 신청',
}

export default function DrainModal({
  modal,
  adoptions,
  pauseStatus,
  onOpen,
  onClose,
  onRelease,
  onApplyPause,
}: Props) {
  const selected =
    'drainId' in modal
      ? adoptions.find(
          (item) =>
            item.drain.drain_id === modal.drainId,
        )
      : undefined

  const alreadyPaused = isPauseActive(
    pauseStatus.active_until,
  )

  const canApplyPause =
    pauseStatus.can_apply &&
    !alreadyPaused &&
    adoptions.length > 0

  return (
    <ModalShell
      title={TITLES[modal.type]}
      onClose={onClose}
    >
      {modal.type === 'growth' && (
        <GrowthCatalog
          adoptions={adoptions}
          selected={selected}
          onSelect={(drainId) =>
            onOpen({
              type: 'growth',
              drainId,
            })
          }
          onPreview={(level) =>
            onOpen({
              type: 'preview',
              drainId: modal.drainId,
              level,
            })
          }
        />
      )}

      {modal.type === 'preview' && (
        <GrowthPreview
          level={modal.level}
          onBack={() =>
            onOpen({
              type: 'growth',
              drainId: modal.drainId,
            })
          }
        />
      )}

      {modal.type === 'inspect' && selected && (
        <InspectForm
          key={selected.adoption_id}
    drainId={selected.drain.drain_id}
    adoptionName={selected.adoption_name}
    onCancel={onClose}
        />
      )}

      {modal.type === 'release' && selected && (
        <ReleaseForm
          onConfirm={(payload) =>
            onRelease(
              selected.adoption_id,
              payload,
            )
          }
        />
      )}

      {modal.type === 'pause' && (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-[#607C99]">
            점검 쉬기는 내가 입양한 모든 빗물받이에
            14일간 적용돼요.
          </p>

          <p className="text-xs text-[#8297AC]">
            마지막 신청 이후 90일이 지나야 다시 신청할 수
            있어요. 쉬는 동안에도 비 예보 점검 요청은
            발생할 수 있어요.
          </p>

          {alreadyPaused && (
            <p className="rounded-xl bg-[#EAF6FF] p-3 text-xs text-[#3489DC]">
              점검 쉬기 종료 예정:{' '}
              {formatCareDate(
                pauseStatus.active_until,
              )}
            </p>
          )}

          {!pauseStatus.can_apply &&
            !alreadyPaused &&
            pauseStatus.next_available_at && (
              <p className="text-xs text-[#A78218]">
                다음 신청 가능일:{' '}
                {formatCareDate(
                  pauseStatus.next_available_at,
                )}
              </p>
            )}

          <button
            type="button"
            disabled={!canApplyPause}
            onClick={onApplyPause}
            className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {alreadyPaused
              ? '이미 점검 쉬기 중이에요'
              : '점검 쉬기 신청 (시연)'}
          </button>
        </div>
      )}
    </ModalShell>
  )
}
