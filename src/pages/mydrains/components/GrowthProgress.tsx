
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
    <div className="mt-2">
      <div className="mb-2 flex justify-between gap-2">
        <strong className="text-sm text-[#427ED0]">
          {adoption.xp} XP
        </strong>

        <span className="text-[11px] text-[#78899F]">
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
          className="h-full rounded-full bg-[#6099E8]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
