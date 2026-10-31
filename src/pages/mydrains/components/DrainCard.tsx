
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import Character from '../../../components/common/Character'

import type {
  DrainModalType,
  MyAdoptionDto,
} from '../../../types/myDrains'

import { formatCareDate } from '../utils'
import GrowthProgress from './GrowthProgress'

type Props = {
  adoption: MyAdoptionDto
  accountPauseUntil: string | null
  onOpen: (modal: DrainModalType) => void
}

export default function DrainCard({
  adoption,
  accountPauseUntil,
  onOpen,
}: Props) {
  const drainId = adoption.drain.drain_id

  // 현재 시각은 렌더링이 아닌 Effect의 타이머에서 갱신
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setNow(Date.now())
    }

    const initialTimer = window.setTimeout(updateTime, 0)
    const interval = window.setInterval(updateTime, 60_000)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [])

  const pauseUntil =
    accountPauseUntil ?? adoption.pause_until

  const pauseEndTime = pauseUntil
    ? new Date(pauseUntil).getTime()
    : null

  const paused =
    now !== null &&
    pauseEndTime !== null &&
    Number.isFinite(pauseEndTime) &&
    pauseEndTime > now

  const nextInspectionTime =
    new Date(adoption.next_inspection_at).getTime()

  const inspectionOverdue =
    now !== null &&
    !paused &&
    Number.isFinite(nextInspectionTime) &&
    nextInspectionTime < now

  return (
    <article className="relative rounded-[24px] border border-[#E8EDF5] bg-white p-4 shadow-[0_4px_18px_rgba(23,43,77,0.04)]">
      <details className="absolute right-3 top-3 z-10" onKeyDown={(event) => {
        if (event.key === 'Escape') event.currentTarget.open = false
      }}>
        <summary aria-label={`${adoption.adoption_name} 관리`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-xl leading-none text-[#8795AA] hover:bg-[#F3F6FA] [&::-webkit-details-marker]:hidden">···</summary>
        <button type="button" onClick={(event) => {
          event.currentTarget.closest('details')?.removeAttribute('open')
          onOpen({ type: 'release', drainId })
        }} className="absolute right-0 mt-1 whitespace-nowrap rounded-xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs font-semibold text-[#C85D5D] shadow-lg">입양 그만두기</button>
      </details>

      <div className="flex items-center gap-3 pr-6">
        <div className="shrink-0"><Character type="level" level={adoption.level} size={80} /></div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold tracking-tight text-[#203451]">{adoption.adoption_name}</h3>
          <p className="mt-1 text-xs font-semibold text-[#3981F7]">Lv.{adoption.level} · {adoption.stage}</p>
          <p className="mt-1 text-xs text-[#78899F]">{adoption.drain.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-[#EAF7EF] px-2 py-1 text-[10px] font-bold text-[#32865A]">입양 중</span>
            {paused && <span className="rounded-lg bg-[#EAF2FF] px-2 py-1 text-[10px] font-bold text-[#3981F7]">점검 쉬는 중</span>}
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-end">
        <button type="button" onClick={() => onOpen({ type: 'growth', drainId })} className="rounded-lg px-1 py-1.5 text-xs font-semibold text-[#3981F7]">성장 도감 ›</button>
      </div>
      <GrowthProgress adoption={adoption} />

      {(adoption.lonely || (!paused && adoption.release_warning) || inspectionOverdue) && (
        <div className="mt-3 flex gap-2.5 rounded-2xl bg-[#FFF6E2] p-3">
          <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8A329] text-xs font-bold text-white">!</span>
          <div className="min-w-0 text-xs leading-relaxed text-[#91652D]">
            <p className="font-bold text-[#A96919]">{inspectionOverdue ? '점검이 늦어졌어요' : adoption.lonely ? '또랑이가 외로워해요' : '입양 해제에 주의해 주세요'}</p>
            {adoption.lonely && <p className="mt-1">비 예보 점검을 {adoption.missed_forecast_count}회 놓쳤어요.</p>}
            {!paused && adoption.release_warning && <p className="mt-1">35일 미점검 시 입양이 자동 해제될 수 있어요.</p>}
          </div>
        </div>
      )}

      <dl className="mt-3 space-y-2 rounded-2xl bg-[#F4F7FC] p-3 text-xs leading-relaxed">
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
          <dt className="text-[#78899F]">마지막 돌봄</dt><dd className="text-[#637790]">{formatCareDate(adoption.last_care_at)}</dd>
        </div>
        <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
          <dt className="text-[#78899F]">{paused ? '점검 쉬기 종료' : '다음 점검'}</dt>
          <dd className={`font-bold ${inspectionOverdue ? 'text-[#AD731D]' : 'text-[#203451]'}`}>{formatCareDate(paused ? pauseUntil : adoption.next_inspection_at)}</dd>
        </div>
      </dl>
      <button type="button" onClick={() => onOpen({ type: 'inspect', drainId })} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6099E8] px-3 text-sm font-bold text-white transition hover:bg-[#4A88DB] active:scale-[0.99]">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 6h4l2-3h4l2 3h4v14H4z" strokeLinejoin="round"/><circle cx="12" cy="13" r="4"/></svg>
        사진으로 점검 기록
      </button>
      <Link to={`/drains/${drainId}`} className="mt-1 flex min-h-10 items-center justify-center text-xs font-semibold text-[#3981F7]">상세 보기 ›</Link>
    </article>
  )
}
