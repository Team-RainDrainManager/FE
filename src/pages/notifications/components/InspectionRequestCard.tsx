
import { useEffect, useState } from 'react'
import Character from '../../../components/common/Character'

import type {
  InspectionRequest,
  RequestAction,
} from '../../../types/notifications'

interface InspectionRequestCardProps {
  request: InspectionRequest
  onRespond: (
    requestId: number,
    action: RequestAction,
  ) => void
  onViewDrain: (
    drainId: number,
    requestId: number,
  ) => void
  disabled?: boolean
  busy?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  SENT: 'bg-[#FFF4DC] text-[#8A6510]',
  ACCEPTED: 'bg-[#E5F7ED] text-[#1F7A55]',
  OPEN: 'bg-[#FFF0E4] text-[#A85A1F]',
  CLAIMED: 'bg-[#E8F3FF] text-[#338CF0]',
  COMPLETED: 'bg-[#E5F7ED] text-[#1F7A55]',
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  SENT: '응답 대기',
  ACCEPTED: '점검 예정',
  OPEN: '주변 공개',
  CLAIMED: '대신 점검 중',
  COMPLETED: '점검 완료',
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
})

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})

function formatDate(value: string, now: number) {
  const date = new Date(value)

  const day = Math.floor(
    (date.getTime() + 9 * 60 * 60 * 1000) / 86400000,
  )
  const today = Math.floor(
    (now + 9 * 60 * 60 * 1000) / 86400000,
  )

  const label =
    day === today
      ? '오늘'
      : day === today + 1
        ? '내일'
        : dateFormatter.format(date)

  return `${label} ${timeFormatter.format(date)}`
}

export default function InspectionRequestCard({
  request,
  onRespond,
  onViewDrain,
  disabled = false,
  busy = false,
}: InspectionRequestCardProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      60_000,
    )
    return () => window.clearInterval(timer)
  }, [])

  const level = request.drain.level
  const isOwner = request.role === 'OWNER'
  const isNearby = request.role === 'NEARBY'

  const canReply = request.availableActions.includes('REPLY')
  const canClaim = request.availableActions.includes('CLAIM')
  const canInspect = request.availableActions.includes('INSPECT')

  const finished = request.remainingMinutes === null
  const remaining =
    request.remainingMinutes === null
      ? null
      : Math.max(0, request.remainingMinutes)

  return (
    <article className="my-3 rounded-[22px] border border-[#E2EAF4] bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EDF4FF]"
          aria-hidden="true"
        >
          {level != null ? (
            <Character
              type="level"
              level={Math.min(50, Math.max(1, level))}
              size={48}
            />
          ) : (
            <Character type="state" state="happy" size={48} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[15px] font-bold leading-5 text-[#203451]">
            {request.drain.name?.trim() ||
              `빗물받이 #${request.drain.drainId}`}
          </h3>

          <p className="mt-0.5 text-[13px] leading-4 text-[#637790]">
            {isOwner
              ? '내 또랑이'
              : isNearby
                ? request.distanceM != null
                  ? `내 위치에서 ${Math.round(request.distanceM)}m`
                  : '내 또랑이 근처'
                : '내가 수락한 요청'}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[12px] font-bold ${
            STATUS_COLORS[request.state] ??
            'bg-[#F0F3F6] text-[#8595A3]'
          }`}
        >
          {REQUEST_STATUS_LABELS[request.state] ??
            (finished ? '요청 종료' : '진행 중')}
        </span>
      </div>

      <div className="mt-3 border-t border-[#EDF1F6] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="text-[15px] font-bold leading-5 text-[#203451]">
            {formatDate(
              canReply
                ? request.replyDeadlineAt
                : request.deadlineAt,
              now,
            )}
            {canReply
              ? '까지 응답'
              : finished
                ? ' 마감'
                : '까지 완료'}
          </p>

          {remaining !== null && (
            <span className="text-[13px] font-semibold text-[#3981F7]">
              {Math.floor(remaining / 60)}시간{' '}
              {remaining % 60}분 남음
            </span>
          )}
        </div>

        <div
          className={`mt-2 grid gap-2 text-[13px] leading-4 ${
            canReply ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <div className="rounded-xl bg-[#F4F7FB] px-2.5 py-2">
            <p className="text-[#637790]">비 시작</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#203451]">
              {formatDate(request.rainStartAt, now)}
            </p>
          </div>

          {canReply && (
            <div className="rounded-xl bg-[#F4F7FB] px-2.5 py-2">
              <p className="text-[#637790]">점검 마감</p>
              <p className="mt-0.5 font-bold tabular-nums text-[#203451]">
                {formatDate(request.deadlineAt, now)}
              </p>
            </div>
          )}
        </div>
      </div>

      {canReply && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onRespond(request.requestId, 'accept')
            }
            className="min-h-11 rounded-xl bg-[#3981F7] px-2 text-[13px] font-bold text-white hover:bg-[#2870E6] disabled:opacity-50"
          >
            {busy ? '처리 중...' : '점검 가능'}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onRespond(request.requestId, 'decline')
            }
            className="min-h-11 rounded-xl border border-[#DCE5F0] px-2 text-[13px] font-bold text-[#53647E] hover:bg-[#F8FAFD] disabled:opacity-50"
          >
            점검 불가
          </button>
        </div>
      )}

      {canClaim && (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onRespond(request.requestId, 'claim')
          }
          className="mt-3 min-h-11 w-full rounded-xl bg-[#EAF2FF] px-2 text-[13px] font-bold text-[#3981F7] hover:bg-[#DFEAFF] disabled:opacity-50"
        >
          {busy ? '처리 중...' : '대신 점검하기 ›'}
        </button>
      )}

      {canInspect && (
        <button
          type="button"
          onClick={() =>
            onViewDrain(
              request.drain.drainId,
              request.requestId,
            )
          }
          className="mt-2 min-h-11 w-full rounded-xl px-2 text-[13px] font-bold text-[#3981F7] hover:bg-[#F6F9FF]"
        >
          점검하러 가기 ›
        </button>
      )}

      {isOwner && request.state === 'OPEN' && (
        <p className="mt-2 text-[13px] leading-5 text-[#A97822]">
          주변 사용자에게 대신 점검 요청을 공개했어요.
        </p>
      )}
    </article>
  )
}
