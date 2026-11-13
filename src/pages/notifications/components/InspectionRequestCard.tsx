
import { useEffect, useState } from 'react'
import Character from '../../../components/common/Character'
import { formatKstDayAndTime } from '../../../utils/kstDateTime'

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
  SENT: 'bg-[#FFF4DC] text-[#8A6510] [html[data-dd-theme=dark]_&]:bg-[#493922] [html[data-dd-theme=dark]_&]:text-[#f9d78d]',
  ACCEPTED: 'bg-[#E5F7ED] text-[#1F7A55] [html[data-dd-theme=dark]_&]:bg-[#1e493c] [html[data-dd-theme=dark]_&]:text-[#9de2bc]',
  OPEN: 'bg-[#FFF0E4] text-[#A85A1F] [html[data-dd-theme=dark]_&]:bg-[#50382a] [html[data-dd-theme=dark]_&]:text-[#ffc49c]',
  CLAIMED: 'bg-[#E8F3FF] text-[#338CF0] [html[data-dd-theme=dark]_&]:bg-[#283f5b] [html[data-dd-theme=dark]_&]:text-[#9bcaff]',
  COMPLETED: 'bg-[#E5F7ED] text-[#1F7A55] [html[data-dd-theme=dark]_&]:bg-[#1e493c] [html[data-dd-theme=dark]_&]:text-[#9de2bc]',
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  SENT: '응답 대기',
  ACCEPTED: '점검 예정',
  OPEN: '주변 공개',
  CLAIMED: '대신 점검 중',
  COMPLETED: '점검 완료',
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
  const deadline = formatKstDayAndTime(
    canReply ? request.replyDeadlineAt : request.deadlineAt,
    now,
  )
  const deadlineSuffix = canReply ? '까지 응답' : finished ? ' 마감' : '까지 완료'
  const remaining =
    request.remainingMinutes === null
      ? null
      : Math.max(0, request.remainingMinutes)

  return (
    <article className="my-3 rounded-[22px] border border-[#dfe6f3] bg-white p-3.5 [html[data-dd-theme=dark]_&]:border-[#354962] [html[data-dd-theme=dark]_&]:bg-[#182638]">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eaf0ff] [html[data-dd-theme=dark]_&]:bg-[#283f5b]"
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
          <h3 className="break-words text-[15px] font-bold leading-5 text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
            {request.drain.name?.trim() ||
              `빗물받이 #${request.drain.drainId}`}
          </h3>

          <p className="mt-0.5 text-[13px] leading-4 text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">
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
            'bg-[#F0F3F6] text-[#8595A3] [html[data-dd-theme=dark]_&]:bg-[#263c56] [html[data-dd-theme=dark]_&]:text-[#b4c7de]'
          }`}
        >
          {REQUEST_STATUS_LABELS[request.state] ??
            (finished ? '요청 종료' : '진행 중')}
        </span>
      </div>

      <div className="mt-3 border-t border-[#edf2f8] [html[data-dd-theme=dark]_&]:border-[#354962] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="text-[15px] font-bold leading-5 text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
            {deadline ? `${deadline}${deadlineSuffix}` : '마감 확인 중'}
          </p>

          {remaining !== null && (
            <span className="text-[13px] font-semibold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">
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
          <div className="rounded-xl bg-[#f5f7ff] [html[data-dd-theme=dark]_&]:bg-[#263c56] px-2.5 py-2">
            <p className="text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">비 시작</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
              {formatKstDayAndTime(request.rainStartAt, now) ?? '확인 중'}
            </p>
          </div>

          {canReply && (
            <div className="rounded-xl bg-[#f5f7ff] [html[data-dd-theme=dark]_&]:bg-[#263c56] px-2.5 py-2">
              <p className="text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">점검 마감</p>
              <p className="mt-0.5 font-bold tabular-nums text-[#193454] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
                {formatKstDayAndTime(request.deadlineAt, now) ?? '확인 중'}
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
            className="min-h-11 rounded-xl bg-[#338CF0] px-2 text-[13px] font-bold text-white hover:bg-[#2870E6] disabled:opacity-50"
          >
            {busy ? '처리 중...' : '점검 가능'}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onRespond(request.requestId, 'decline')
            }
            className="min-h-11 rounded-xl border border-[#DCE5F0] [html[data-dd-theme=dark]_&]:border-[#354962] px-2 text-[13px] font-bold text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de] hover:bg-[#F8FAFD] [html[data-dd-theme=dark]_&]:hover:bg-[#263c56] disabled:opacity-50"
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
          className="mt-3 min-h-11 w-full rounded-xl bg-[#eaf0ff] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-2 text-[13px] font-bold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff] hover:bg-[#DFEAFF] [html[data-dd-theme=dark]_&]:hover:bg-[#354962] disabled:opacity-50"
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
          className="mt-2 min-h-11 w-full rounded-xl px-2 text-[13px] font-bold text-[#338CF0] [html[data-dd-theme=dark]_&]:text-[#9bcaff] hover:bg-[#F6F9FF] [html[data-dd-theme=dark]_&]:hover:bg-[#263c56]"
        >
          점검하러 가기 ›
        </button>
      )}

      {isOwner && request.state === 'OPEN' && (
        <p className="mt-2 text-[13px] leading-5 text-[#A97822] [html[data-dd-theme=dark]_&]:text-[#f9d78d]">
          주변 사용자에게 대신 점검 요청을 공개했어요.
        </p>
      )}
    </article>
  )
}
