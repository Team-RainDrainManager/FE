
import { useState } from 'react'
import Character from '../../../components/common/Character'
import ModalShell from '../../../components/common/Modalshell'
import type {
  DrainAdoption,
  DrainGrowthDto,
} from '../../../types/drainDetail'

type Props = {
  adoption: DrainAdoption | null
  growth?: DrainGrowthDto
}

export default function DrainGrowth({
  adoption,
  growth,
}: Props) {
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [previewLevel, setPreviewLevel] =
    useState<number | null>(null)

  if (!adoption) return null

  const level = growth?.level ?? adoption.level
  const xp = growth?.xp ?? adoption.score

  const getStageName = (targetLevel: number) => {
    if (!growth) return '성장 단계'

    const stage = [...growth.stages]
      .filter((item) => item.from_level <= targetLevel)
      .sort((a, b) => b.from_level - a.from_level)[0]

    return stage?.name ?? '성장 단계'
  }

  const closeCatalog = () => {
    setCatalogOpen(false)
    setPreviewLevel(null)
  }

  return (
    <>
      <section className="border-t border-[#EDF1F6] bg-[#F7FAFF] p-4">
        <div className="flex items-center gap-3">
          <Character
            type="level"
            level={level}
            size={88}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[#3488CB]">
              이 빗물받이의 성장
            </p>

            <h3 className="mt-2 text-base font-bold text-[#203451]">
              Lv.{level}
            </h3>

            <p className="mt-1 text-xs text-[#607C99]">
              {growth?.stage ?? '성장 중'}
            </p>

            <p className="mt-2 text-xs font-semibold text-[#2784C9]">
              {xp} XP
            </p>
          </div>
        </div>

        {growth && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[#7896AD]">
              <span>성장 진행률</span>
              <span>
                {level >= growth.max_level
                  ? '최고 레벨'
                  : `다음 레벨까지 ${growth.next_level_xp} XP`}
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#6099E8]"
                style={{
                  width: `${Math.min(100, Math.max(0, growth.progress_percent))}%`,
                }}
              />
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] text-[#7896AD]">
          집사가 바뀌어도 성장 기록은 이어져요.
        </p>
      </section>

      {growth && (
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className="w-full border-t border-[#EDF1F6] bg-white px-4 py-3 text-right text-xs font-semibold text-[#3981F7]"
        >
          성장 도감 보기 →
        </button>
      )}

      {catalogOpen && growth && (
        <ModalShell
          title={
            previewLevel === null
              ? 'Lv.0~50 성장 도감'
              : `Lv.${previewLevel} 미리보기`
          }
          onClose={closeCatalog}
        >
          {previewLevel === null ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from(
                { length: growth.max_level + 1 },
                (_, i) => i,
              ).map((itemLevel) => (
                <button
                  type="button"
                  key={itemLevel}
                  onClick={() => setPreviewLevel(itemLevel)}
                  className={`flex flex-col items-center rounded-xl border p-2 ${
                    itemLevel === level
                      ? 'border-[#57ABE8] bg-[#EEFAFF]'
                      : 'border-[#DFEAF4]'
                  }`}
                >
                  <Character
                    type="level"
                    level={itemLevel}
                    size={75}
                  />
                  <strong className="mt-1 text-xs">
                    Lv.{itemLevel}
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="flex justify-center">
                <Character
                  type="level"
                  level={previewLevel}
                  size={190}
                />
              </div>

              <p className="mt-3 text-sm font-bold text-[#203451]">
                Lv.{previewLevel} · {getStageName(previewLevel)}
              </p>

              <button
                type="button"
                onClick={() => setPreviewLevel(null)}
                className="mt-5 w-full rounded-full bg-[#EAF2FF] p-3 text-xs font-bold text-[#3981F7]"
              >
                도감으로 돌아가기
              </button>
            </div>
          )}
        </ModalShell>
      )}
    </>
  )
}
