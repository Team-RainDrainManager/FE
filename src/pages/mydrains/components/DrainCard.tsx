
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
    <article className="rounded-[22px] border border-[#E8F1F9] bg-white p-[15px]">
      <div className="flex items-center gap-3">
        <Character
          type="level"
          level={adoption.level}
          size={98}
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-[#24496B]">
            {adoption.adoption_name}
          </h3>

          <p className="mt-1 text-xs font-semibold text-[#2F7EBA]">
            Lv.{adoption.level} · {adoption.stage}
          </p>

          <p className="mt-1.5 text-[10px] text-[#758B9F]">
            {adoption.drain.name}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-[#E8F7EF] px-2 py-1 text-[10px] font-bold text-[#259B68]">
              입양 중
            </span>

            {paused && (
              <span className="rounded-lg bg-[#EAF6FF] px-2 py-1 text-[10px] font-bold text-[#3489DC]">
                점검 쉬는 중
              </span>
            )}

            {!paused && adoption.release_warning && (
              <span className="rounded-lg bg-[#FFF5DA] px-2 py-1 text-[10px] font-bold text-[#A78218]">
                입양 해제 경고
              </span>
            )}
          </div>
        </div>
      </div>

      <GrowthProgress adoption={adoption} />

      {adoption.lonely && (
        <p className="mt-3 rounded-xl bg-[#FFF5DE] p-3 text-[11px] text-[#987722]">
          또랑이가 외로워해요.
          비 예보 점검을 {adoption.missed_forecast_count}회 놓쳤어요.
        </p>
      )}

      {!paused && adoption.release_warning && (
        <p className="mt-3 rounded-xl bg-[#FFF5DE] p-3 text-[11px] text-[#987722]">
          35일 미점검 시 입양이 자동 해제될 수 있어요.
        </p>
      )}

      <div className="mt-3 text-[11px] leading-relaxed text-[#8297AC]">
        <p>
          마지막 돌봄:{' '}
          {formatCareDate(adoption.last_care_at)}
        </p>

        <p className="mt-1">
          {paused
            ? `점검 쉬기 종료: ${formatCareDate(pauseUntil)}`
            : `다음 점검: ${formatCareDate(
                adoption.next_inspection_at,
              )}`}
        </p>

        {inspectionOverdue && (
          <p className="mt-1 font-semibold text-[#A78218]">
            점검 예정일이 지났어요.
          </p>
        )}
      </div>

      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={() =>
            onOpen({
              type: 'growth',
              drainId,
            })
          }
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          성장 도감 보기 →
        </button>
      </div>

      {/* 점검 버튼: CameraCapture가 포함된 모달 열기 */}
      <button
        type="button"
        onClick={() =>
          onOpen({
            type: 'inspect',
            drainId,
          })
        }
        className="mt-4 min-h-10 w-full rounded-full bg-[#329BEC] px-4 text-xs font-bold text-white"
      >
        사진으로 점검 기록
      </button>

      <div className="mt-3 flex justify-between gap-3">
        <Link
          to={`/drains/${drainId}`}
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          상세 보기
        </Link>

        <button
          type="button"
          onClick={() =>
            onOpen({
              type: 'release',
              drainId,
            })
          }
          className="text-[11px] font-semibold text-[#3489DC]"
        >
          입양 그만두기
        </button>
      </div>
    </article>
  )
}
