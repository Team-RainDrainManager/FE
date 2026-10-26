
import Character from '../../../components/common/Character'
import type { DrainModalType, MyDrain } from '../../../types/myDrains'
import { levelStage } from '../utils'
import { InspectForm, RenameForm } from './ActionForms'
import { StatusTag } from './DrainCard'
import GrowthCatalog, { GrowthPreview } from './GrowthCatalog'
import GrowthProgress from './GrowthProgress'
import ModalShell from './ModalShell'

type Props = {
  modal: DrainModalType
  drains: MyDrain[]
  paused: boolean
  onOpen: (modal: DrainModalType) => void
  onClose: () => void
  onRename: (id: number, name: string) => void
  onRelease: (id: number) => void
  onTogglePause: () => void
}

const TITLES: Record<DrainModalType['type'], string> = {
  growth: '빗물받이별 성장 도감',
  preview: '성장 모습 미리보기',
  rename: '또랑이 이름 짓기',
  locked: '이름 짓기 잠금',
  inspect: '사진으로 점검 기록',
  detail: '빗물받이 상세',
  release: '입양 그만두기',
  pause: '점검 쉬기 신청',
}

export default function DrainModal({
  modal,
  drains,
  paused,
  onOpen,
  onClose,
  onRename,
  onRelease,
  onTogglePause,
}: Props) {
  const drain =
    'drainId' in modal
      ? drains.find((item) => item.id === modal.drainId)
      : undefined

  return (
    <ModalShell
      title={TITLES[modal.type]}
      onClose={onClose}
    >
      {modal.type === 'growth' && (
        <GrowthCatalog
          drains={drains}
          drain={drain}
          onSelect={(id) => onOpen({ type: 'growth', drainId: id })}
          onPreview={(level) =>
            onOpen({ type: 'preview', drainId: modal.drainId, level })
          }
        />
      )}

      {modal.type === 'preview' && (
        <GrowthPreview
          level={modal.level}
          onBack={() =>
            onOpen({ type: 'growth', drainId: modal.drainId })
          }
        />
      )}

      {modal.type === 'locked' && (
        <div className="text-center">
          <div className="flex justify-center">
            <Character type="level" level={drain?.level ?? 0} size={120} />
          </div>
          <p className="mt-4 text-sm text-[#758B9F]">
            Lv.10부터 또랑이에게 이름을 지어줄 수 있어요.
          </p>
        </div>
      )}

      {modal.type === 'rename' && drain && (
        <RenameForm
          key={drain.id}
          drain={drain}
          onSave={(name) => onRename(drain.id, name)}
        />
      )}

      {modal.type === 'inspect' && drain && (
        <InspectForm key={drain.id} drain={drain} />
      )}

      {modal.type === 'detail' && drain && (
        <div className="space-y-3 text-xs text-[#758B9F]">
          <div className="flex justify-center">
            <Character type="level" level={drain.level} size={150} />
          </div>
          <h3 className="text-center text-base font-bold text-[#24496B]">
            {drain.name}
          </h3>
          <p>빗물받이 위치: {drain.locationName}</p>
          <p>성장 단계: Lv.{drain.level} · {levelStage(drain.level)}</p>
          <StatusTag status={drain.status} />
          <GrowthProgress drain={drain} />
          <p>상세 페이지는 후속 이슈에서 구현할 예정이에요.</p>
        </div>
      )}

      {modal.type === 'release' && drain && (
        <div className="space-y-4 text-sm">
          <p>{drain.name}의 입양을 그만둘까요?</p>
          <p className="rounded-xl bg-[#FFF5DE] p-3 text-xs text-[#987722]">
            시연 목록에서만 제거됩니다. 서버에는 반영되지 않아요.
          </p>
          <button
            type="button"
            onClick={() => onRelease(drain.id)}
            className="w-full rounded-full bg-[#329BEC] p-3 font-bold text-white"
          >
            시연 목록에서 제외
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[#F1F6FB] p-3"
          >
            취소
          </button>
        </div>
      )}

      {modal.type === 'pause' && (
        <div className="space-y-4 text-sm">
          <p className="text-[#758B9F]">
            점검을 잠시 쉬는 상태의 UI를 확인할 수 있어요.
          </p>
          <button
            type="button"
            onClick={onTogglePause}
            className="w-full rounded-full bg-[#329BEC] p-3 font-bold text-white"
          >
            {paused ? '점검 쉬기 해제 (시연)' : '점검 쉬기 신청 (시연)'}
          </button>
        </div>
      )}
    </ModalShell>
  )
}
