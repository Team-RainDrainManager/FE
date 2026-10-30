
import type { MyAdoptionDto } from '../../../types/myDrains'

export default function GrowthProgress({
  adoption,
}: {
  adoption: MyAdoptionDto
}) {
  const percent = Math.min(
    100,
    Math.max(0, adoption.progress_percent),
  )

  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between gap-2">
        <strong className="text-[13px] text-[#2784C9]">
          {adoption.xp} XP
        </strong>

        <span className="text-[10px] text-[#7896AD]">
          {adoption.level >= 50
            ? '최고 레벨'
            : `다음 레벨까지 ${adoption.next_level_xp} XP`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${adoption.adoption_name} 성장 진행률`}
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
