
import ModalShell from '../../../components/common/Modalshell'

import type {
  DrainModalType,
  MyAdoptionDto,
  ReleaseAdoptionRequest,
} from '../../../types/myDrains'


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
  onOpen: (modal: DrainModalType) => void
  onClose: () => void
  onRelease: (
    adoptionId: number,
    payload: ReleaseAdoptionRequest,
  ) => void
}

const TITLES: Record<DrainModalType['type'], string> = {
  growth: '빗물받이별 성장 도감',
  preview: '성장 모습 미리보기',
  inspect: '사진으로 점검 기록',
  release: '입양 그만두기',
}

export default function DrainModal({
  modal,
  adoptions,
  onOpen,
  onClose,
  onRelease,
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

      
    </ModalShell>
  )
}
