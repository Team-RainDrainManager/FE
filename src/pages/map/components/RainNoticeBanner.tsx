import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import { getRainNotice, type RainNotice } from '../../../apis/rain-notice'
import type { Coordinates } from '../../../apis/requests'
import { formatKstDayAndTime, getKstDayLabel } from '../../../utils/kstDateTime'

function shortLabel(notice: RainNotice, now: number): string {
  if (notice.state === 'RAINING') return '비 오는 중'
  const day = getKstDayLabel(notice.forecast?.rainDate, now)
  return day ? `${day} 비 예보` : '비 예보'
}

/**
 * 지도 위 비 예보 배너 (GET /api/v1/rain-notice).
 * 지금 비가 오는지, 오늘 · 내일 비 예보가 있는지와 대신 점검 진행 상황을 보여 줍니다.
 */
export default function RainNoticeBanner({ coordinates }: { coordinates: Coordinates }) {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { data: notice } = useQuery({
    queryKey: ['rain-notice', coordinates],
    queryFn: ({ signal }) => getRainNotice(signal, coordinates),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (!notice || notice.state === 'NONE') return null

  const raining = notice.state === 'RAINING'
  const rainStart = formatKstDayAndTime(notice.forecast?.rainStartAt, now)
  const deadline = formatKstDayAndTime(notice.forecast?.completeDeadlineAt, now)
  const help = notice.help

  return (
    <div className="absolute left-3 top-[72px] z-20 max-w-[calc(100%-24px)] break-keep">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 items-center gap-1.5 rounded-2xl border px-3 text-[13px] font-bold shadow-[0_4px_14px_rgba(23,43,77,0.12)] ${
          raining
            ? 'border-[#3981F7] bg-[#3981F7] text-white'
            : 'border-[#C6DCFF] bg-[#EAF2FF] text-[#3981F7]'
        }`}
      >
        <span aria-hidden="true">{raining ? '☔' : '🌧'}</span>
        <span>{shortLabel(notice, now)}</span>
        <span aria-hidden="true" className="text-[11px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <section
          aria-label="비 예보 안내"
          className="mt-2 w-[300px] max-w-full rounded-2xl border border-[#E2EAF4] bg-white p-4 shadow-[0_12px_32px_rgba(23,43,77,0.16)]"
        >
          <p className="text-[15px] font-bold leading-6 text-[#203451]">
            {notice.message?.trim() || (raining ? '비가 오고 있어요.' : '비 예보가 있어요.')}
          </p>
          {raining && (
            <p className="mt-1 text-[13px] leading-5 text-[#53647E]">
              비가 오는 동안에는 점검하지 않아요. 안전한 곳에 머물러 주세요.
            </p>
          )}

          {notice.forecast && (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
                <dt className="text-[#637790]">비 시작</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[#203451]">{rainStart ?? '확인 중'}</dd>
              </div>
              <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
                <dt className="text-[#637790]">점검 마감</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[#203451]">{deadline ?? '확인 중'}</dd>
              </div>
            </dl>
          )}

          {help && (
            <p className="mt-3 text-[13px] leading-5 text-[#53647E]">
              도움이 필요한 곳 <b className="text-[#203451]">{help.needsHelpCount}</b> · 점검 중{' '}
              <b className="text-[#203451]">{help.inProgressCount}</b> · 완료{' '}
              <b className="text-[#203451]">{help.doneCount}</b>
            </p>
          )}

          {notice.forecast?.simulated && (
            <p className="mt-2 text-[12px] leading-5 text-[#637790]">시연용 가상 예보예요.</p>
          )}

          {notice.forecast && (
            <Link
              to="/notifications"
              className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-[#3981F7] px-3 text-[14px] font-bold text-white"
            >
              점검 요청 보러 가기
            </Link>
          )}
        </section>
      )}
    </div>
  )
}
