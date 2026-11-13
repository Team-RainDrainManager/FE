
import ModalShell from '../../../components/common/Modalshell'

import type {
  DrainModalType,
  MyAdoptionDto,
  ReleaseAdoptionRequest,
} from '../../../types/myDrains'


import {
  InspectForm,
  ReleaseForm,
  RenameForm,
} from './ActionForms'

import GrowthCatalog, {
  GrowthPreview,
} from './GrowthCatalog'

type Props = {
  modal: DrainModalType
  adoptions: MyAdoptionDto[]
  onOpen: (modal: DrainModalType) => void
  onClose: () => void
  onRename: (adoptionId: number, drainId: number, nickname: string) => void
  isRenaming: boolean
  renameError: string | null
  onRelease: (
    adoptionId: number,
    payload: ReleaseAdoptionRequest,
  ) => void
  isReleasing: boolean
  releaseError: string | null
}

const TITLES: Record<DrainModalType['type'], string> = {
  growth: '빗물받이별 성장 도감',
  preview: '성장 모습 미리보기',
  inspect: '사진으로 점검 기록',
  rename: '또랑이 이름 변경',
  release: '입양 그만두기',
}

export default function DrainModal({
  modal,
  adoptions,
  onOpen,
  onClose,
  onRename,
  isRenaming,
  renameError,
  onRelease,
  isReleasing,
  releaseError,
}: Props) {
  const selected =
    'drainId' in modal
      ? adoptions.find(
          (item) =>
            item.drain.drain_id === modal.drainId,
        )
      : undefined

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
          adoptionId={selected.adoption_id}
          drainId={selected.drain.drain_id}
          adoptionName={selected.adoption_name}
          onCancel={onClose}
        />
      )}

      {modal.type === 'rename' && (
        selected ? (
          <RenameForm
            key={selected.adoption_id}
            currentName={selected.adoption_name}
            isSaving={isRenaming}
            errorMessage={renameError}
            onSave={(nickname) => onRename(selected.adoption_id, modal.drainId, nickname)}
          />
        ) : (
          <p role="alert" className="text-sm">입양 정보를 찾지 못했어요.</p>
        )
      )}

      {modal.type === 'release' && selected && (
        <ReleaseForm
          isSubmitting={isReleasing}
          errorMessage={releaseError}
          onConfirm={(payload) =>
            onRelease(
              selected.adoption_id,
              payload,
            )
          }
        />
      )}

      
    </ModalShell>
  )
}
