import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getAdoptionDetail } from '../../../apis/adoptions'
import { formatCareDate } from '../../mydrains/utils'

const DAY_MS = 24 * 60 * 60 * 1000

type Props = {
  adoptionId: number
  activePauseUntil: string | null
  nextManagementAt?: string | null
  lastManagedAt?: string | null
}

function nextCheckText(days: number | null) {
  if (days === null) return '다음 점검일을 확인하고 있어요'
  if (days > 0) return `다음 점검까지 ${days}일 남았어요`
  if (days === 0) return '오늘이 점검하는 날이에요'
  return `점검이 ${-days}일 지났어요`
}

export default function AdoptionCare({
  adoptionId,
  activePauseUntil,
  nextManagementAt,
  lastManagedAt,
}: Props) {
  const [now] = useState(() => Date.now())
  const { data, isError } = useQuery({
    queryKey: ['adoption-detail', adoptionId],
    queryFn: ({ signal }) => getAdoptionDetail(adoptionId, signal),
    staleTime: 30_000,
    retry: 1,
  })

  const days = typeof data?.daysUntilNextManagement === 'number'
    ? data.daysUntilNextManagement
    : null
  const adoptedAt = data?.adoptedAt ? new Date(data.adoptedAt).getTime() : NaN
  const together = Number.isFinite(adoptedAt)
    ? Math.max(1, Math.floor((now - adoptedAt) / DAY_MS) + 1)
    : null
  const overdue = !activePauseUntil && days !== null && days < 0

  return (
    <section aria-label="돌봄 일정" className="mt-6 break-keep">
      <h3 className="mx-px mb-[11px] text-base font-extrabold tracking-tight text-[#17344C]">
        돌봄 일정
      </h3>

      <div className="rounded-[22px] border border-[#DFEBF3] bg-white px-4 pt-4 pb-[15px] shadow-[0_10px_30px_rgba(40,81,111,0.055)]">
        <dl>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-[11px]">
              <span className="grid size-[39px] shrink-0 place-items-center rounded-[13px] bg-[#E9F5FD] text-[#276C9B]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M7 3v4m10-4v4M3 10h18m-12 5 2 2 4-4" />
                </svg>
              </span>

              <div className="min-w-0">
                <dt className="mb-0.5 text-xs font-bold text-[#536A7A]">다음 점검 예정일</dt>
                <dd className="text-[17px] leading-tight font-extrabold tracking-tight text-[#17344C]">
                  {nextManagementAt
  ? new Date(nextManagementAt).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Seoul',
    })
  : '—'}
                </dd>
              </div>
            </div>

            {!activePauseUntil && days !== null && days >= 0 && (
              <span className="shrink-0 rounded-full bg-[#E6F3FD] px-2.5 py-1.5 text-xs font-extrabold text-[#276B94]">
                {days === 0 ? 'D-day' : `D-${days}`}
              </span>
            )}
          </div>

          <div className="mt-[15px] flex items-center justify-between gap-3 border-t border-[#EDF2F6] pt-[13px] text-xs">
            <dt className="text-[#536A7A]">마지막 관리</dt>
            <dd className="text-right font-bold text-[#445D6F]">
              {lastManagedAt ? formatCareDate(lastManagedAt) : '기록 없음'}
            </dd>
          </div>
        </dl>

<p
  className={`mt-2.5 rounded-xl p-2.5 text-center text-xs leading-5 font-bold ${
    !activePauseUntil && overdue
      ? 'bg-[#FFF4DC] text-[#8A6510]'
      : 'bg-[#E6F3FD] text-[#185881]'
  }`}
>
  {activePauseUntil ? '점검 쉬는 중' : nextCheckText(days)}
</p>
        <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-[#536A7A]">
          <div className="rounded-[10px] bg-[#F5F9FC] p-2.5">
            <dt>함께한 날</dt>
            <dd className="mt-1 text-base font-bold text-[#17344C]">
              {together === null ? '—' : `${together}일째`}
            </dd>
          </div>
          <div className="rounded-[10px] bg-[#F5F9FC] p-2.5">
            <dt>놓친 비 예보 점검</dt>
            <dd className="mt-1 text-base font-bold text-[#17344C]">
              {data ? `${data.missedForecastCount ?? 0}회` : '—'}
            </dd>
          </div>
        </dl>

        {isError && (
          <p role="alert" className="mt-3 text-xs text-[#8A6510]">
            돌봄 통계를 불러오지 못했어요.
          </p>
        )}
        {!activePauseUntil && data?.releaseWarning && (
          <p className="mt-3 text-xs leading-5 text-[#B84D4D]">
            점검이 오래 밀려 있어요. 계속 밀리면 입양이 해제될 수 있어요.
          </p>
        )}
        {data?.lonely && (
          <p className="mt-2 text-xs leading-5 text-[#53647E]">
            비 예보 점검을 여러 번 놓쳐 또랑이가 외로워하고 있어요.
          </p>
        )}
        {data?.drain?.risk && (
          <p className="mt-2 text-xs leading-5 text-[#53647E]">
            다시 막히기 쉬운 곳이에요. 비 예보가 있으면 먼저 살펴봐 주세요.
          </p>
        )}
      </div>
    </section>
  )
}