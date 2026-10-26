
import type { MyDrain } from '../../../types/myDrains'
import { nextXP, progressPercent } from '../utils'

export default function GrowthProgress({ drain }: { drain: MyDrain }) {
  const percent = progressPercent(drain)

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-[13px] text-[#2784C9]">
          {drain.xp} XP
        </strong>
        <span className="text-[10px] text-[#7896AD]">
          {drain.level >= 50
            ? '최고 레벨'
            : `다음 레벨까지 ${nextXP(drain)} XP`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${drain.name} 성장 진행률`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-[#EDF3F9]"
      >
        <div
          className="h-full rounded-full bg-[#329BEC]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
