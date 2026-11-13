import Character from '../../../components/common/Character'
import type { DrainAdoption, DrainGrowthDto } from '../../../types/drainDetail'

type Props = {
  adoption: DrainAdoption | null
  growth?: DrainGrowthDto
}

export default function DrainGrowth({ adoption, growth }: Props) {
  if (!adoption) return null

  const level = growth?.level ?? adoption.level
  const xp = growth?.xp ?? adoption.score
  const progress = Math.min(100, Math.max(0, growth?.progress_percent ?? 0))

  return (
    <section
      aria-label="또랑이 캐릭터와 성장 상태"
      className="overflow-hidden rounded-[24px] border border-[#D9EAF4] bg-[var(--dd-surface)] shadow-[0_10px_30px_rgba(40,81,111,0.055)]"
    >
      <div className="relative isolate grid h-[250px] place-items-center overflow-hidden bg-[linear-gradient(162deg,#EDF8FF_2%,#DCEEFB_85%,#E6F5FB_100%)] [html[data-dd-theme=dark]_&]:bg-[linear-gradient(162deg,var(--dd-subtle)_2%,var(--dd-surface)_100%)] max-[360px]:h-[226px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[86px] left-1/2 h-[148px] w-[292px] -translate-x-1/2 rounded-full bg-[#ffffff66] [html[data-dd-theme=dark]_&]:bg-[#88bbff12]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[15px] left-1/2 h-[21px] w-[195px] -translate-x-1/2 rounded-full bg-[#4880A0]/10 blur-md"
        />
        <div className="absolute top-[15px] left-[15px] z-10 rounded-[11px] border border-[#D7EAF5] bg-[#ffffffe6] [html[data-dd-theme=dark]_&]:bg-[var(--dd-surface)] px-2.5 py-[7px] text-xs font-extrabold text-[#245B7D] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]">
          Lv. {level}{growth?.stage ? ` · ${growth.stage}` : ''}
        </div>
        <div className="relative translate-y-2">
          <Character type="level" level={level} size={218} />
        </div>
      </div>

      <div className="px-[17px] pt-[17px] pb-[19px]">
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 className="text-sm font-extrabold tracking-tight text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
            또랑이 성장
          </h3>
          <strong className="text-sm font-extrabold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]">{xp} XP</strong>
        </div>

        {growth && (
          <>
            <div
              role="progressbar"
              aria-label="다음 레벨까지 성장 진행률"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-[11px] h-[9px] overflow-hidden rounded-full bg-[#E7F0F6] [html[data-dd-theme=dark]_&]:bg-[var(--dd-line)]"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#69B6DE,#2C7CAA)] [html[data-dd-theme=dark]_&]:bg-[linear-gradient(90deg,#88bbff,#528fe4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#546D7E] [html[data-dd-theme=dark]_&]:text-[var(--dd-muted)]">
              {level >= growth.max_level
                ? '최고 레벨'
                : `다음 레벨까지 ${growth.next_level_xp} XP`}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
