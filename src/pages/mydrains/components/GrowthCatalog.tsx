
import Character from '../../../components/common/Character'
import type { MyAdoptionDto } from '../../../types/myDrains'
import GrowthProgress from './GrowthProgress'

type Props = {
  adoptions: MyAdoptionDto[]
  selected?: MyAdoptionDto
  onSelect: (drainId: number) => void
  onPreview: (level: number) => void
}

export default function GrowthCatalog({
  adoptions,
  selected,
  onSelect,
  onPreview,
}: Props) {
  return (
    <div>
      {selected && (
        <>
          <label className="mb-4 block text-xs font-bold">
            또랑 선택

            <select
              value={selected.drain.drain_id}
              onChange={(event) =>
                onSelect(Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3"
            >
              {adoptions.map((item) => (
                <option
                  key={item.adoption_id}
                  value={item.drain.drain_id}
                >
                  {item.adoption_name} · Lv.{item.level}
                </option>
              ))}
            </select>
          </label>

          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[#E5F7FF] p-3">
            <Character
              type="level"
              level={selected.level}
              size={88}
            />

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold">
                Lv.{selected.level} · {selected.stage}
              </h3>

              <GrowthProgress adoption={selected} />
            </div>
          </div>
        </>
      )}

      <p className="mb-3 text-xs text-[#758B9F]">
        성장 모습을 누르면 크게 볼 수 있어요.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 51 }, (_, i) => i).map(
          (level) => (
            <button
              key={level}
              type="button"
              onClick={() => onPreview(level)}
              className={`flex flex-col items-center rounded-xl border p-2 ${
                level === selected?.level
                  ? 'border-[#57ABE8] bg-[#EEFAFF]'
                  : 'border-[#DFEAF4]'
              }`}
            >
              <Character
                type="level"
                level={level}
                size={75}
              />

              <strong className="mt-1 text-xs">
                Lv.{level}
              </strong>

              <span className="mt-1 text-[9px] text-[#8CA3B7]">
                {level === selected?.level
                  ? '현재 모습'
                  : selected && level < selected.level
                    ? '지나온 모습'
                    : '미리보기'}
              </span>
            </button>
          ),
        )}
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
        <Character
          type="level"
          level={level}
          size={190}
        />
      </div>

      <h3 className="mt-3 text-sm font-bold">
        Lv.{level}
      </h3>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full rounded-full bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC]"
      >
        성장 도감으로 돌아가기
      </button>
    </div>
  )
}
