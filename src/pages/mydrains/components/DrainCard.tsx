
import Character from '../../../components/common/Character'
import type { DrainModalType, DrainStatus, MyDrain } from '../../../types/myDrains'
import { levelStage, nextCareDate } from '../utils'
import GrowthProgress from './GrowthProgress'

export function StatusTag({ status }: { status: DrainStatus }) {
  const style = {
    normal: ['정상', 'bg-[#E8F7EF] text-[#259B68]'],
    overdue: ['점검 지연', 'bg-[#FFF5DA] text-[#A78218]'],
    blocked: ['막힘 제보', 'bg-[#FFF0ED] text-[#D55746]'],
  }[status]

  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${style[1]}`}>
      {style[0]}
    </span>
  )
}

type Props = {
  drain: MyDrain
  paused: boolean
  onOpen: (modal: DrainModalType) => void
}

export default function DrainCard({ drain, paused, onOpen }: Props) {
  const isOverdue = drain.lastCareDaysAgo >= 28 && !paused

  return (
    <article className="rounded-[22px] border border-[#E8F1F9] bg-white p-[15px]">
      <div className="flex items-center gap-2">
        <Character type="level" level={drain.level} size={98} />

        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold">{drain.name}</h3>

          <p className="mt-1.5 text-xs font-semibold text-[#2F7EBA]">
            Lv.{drain.level} · {levelStage(drain.level)}
          </p>

          <p className="my-1.5 text-[10px] text-[#758B9F]">
            {drain.locationName}
          </p>

          <StatusTag status={drain.status} />
        </div>
      </div>

      <GrowthProgress drain={drain} />

      <button
        type="button"
        onClick={() =>
          onOpen({
            type: drain.level >= 10 ? 'rename' : 'locked',
            drainId: drain.id,
          })
        }
        className="mt-3 text-[11px] font-semibold text-[#3489DC]"
      >
        {drain.level >= 10
          ? '이름 짓기 / 변경'
          : '🔒 Lv.10 이름 짓기'}
      </button>

      <div className="mt-2 text-right">
        <button
          type="button"
          onClick={() => onOpen({ type: 'growth', drainId: drain.id })}
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          성장 도감 보기 →
        </button>
      </div>

      <p className="my-3 text-[10px] text-[#96A8BA]">
        {paused
          ? '점검 쉬는 중 · 시연 화면'
          : `다음 정기 점검 ${nextCareDate(drain)}`}
      </p>

      {isOverdue && (
        <p className="mb-3 rounded-xl bg-[#FFF5DE] p-3 text-[11px] text-[#987722]">
          35일이 되기 전에 점검해주세요.
          입양이 자동 해제될 수 있어요.
        </p>
      )}

      <button
        type="button"
        onClick={() => onOpen({ type: 'inspect', drainId: drain.id })}
        className="min-h-10 w-full rounded-full bg-[#329BEC] px-4 py-2.5 text-xs font-bold text-white"
      >
        사진으로 점검 기록
      </button>

      <div className="mt-3 flex justify-between">
        <button
          type="button"
          onClick={() => onOpen({ type: 'detail', drainId: drain.id })}
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          상세 보기
        </button>

        <button
          type="button"
          onClick={() => onOpen({ type: 'release', drainId: drain.id })}
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          입양 그만두기
        </button>
      </div>
    </article>
  )
}
