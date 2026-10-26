
import Character from '../../../components/common/Character'
import type { MyDrain } from '../../../types/myDrains'
import { LEVELS, levelStage } from '../utils'
import GrowthProgress from './GrowthProgress'

type Props = {
  drains: MyDrain[]
  drain?: MyDrain
  onSelect: (id: number) => void
  onPreview: (level: number) => void
}

export default function GrowthCatalog({
  drains,
  drain,
  onSelect,
  onPreview,
}: Props) {
  return (
    <div>
      {drains.length > 0 && (
        <label className="mb-4 block text-xs font-bold">
          또랑 선택
          <select
            value={drain?.id ?? ''}
            onChange={(event) => onSelect(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3"
          >
            {drains.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · Lv.{item.level}
              </option>
            ))}
          </select>
        </label>
      )}

      {drain && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#E5F7FF] p-3">
          <Character type="level" level={drain.level} size={88} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[#3488CB]">이 빗물받이의 성장</p>
            <h3 className="text-sm font-bold">
              Lv.{drain.level} · {levelStage(drain.level)}
            </h3>
            <GrowthProgress drain={drain} />
          </div>
        </div>
      )}

      <p className="mb-3 text-xs text-[#758B9F]">
        성장 모습을 누르면 크게 볼 수 있어요.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onPreview(level)}
            className={`flex flex-col items-center rounded-xl border p-2 ${
              level === drain?.level
                ? 'border-[#57ABE8] bg-[#EEFAFF]'
                : 'border-[#DFEAF4]'
            }`}
          >
            <Character type="level" level={level} size={75} />
            <strong className="text-xs">Lv.{level}</strong>
            <span className="text-[9px] text-[#8CA3B7]">
              {level === drain?.level
                ? '현재 모습'
                : drain && level < drain.level
                  ? '지나온 모습'
                  : '미리보기'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function GrowthPreview({
  level,
  onBack,
}: {
  level: number
  onBack: () => void
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <Character type="level" level={level} size={190} />
      </div>
      <h3 className="mt-3 font-bold">
        Lv.{level} · {levelStage(level)}
      </h3>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full rounded-full bg-[#EAF6FF] p-3 text-sm font-bold text-[#3489DC]"
      >
        성장 도감으로 돌아가기
      </button>
    </div>
  )
}
