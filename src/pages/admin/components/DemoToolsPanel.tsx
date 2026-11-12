import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelSimulatedForecasts,
  simulateForecast,
  simulateRain,
  type ForecastSimulateResult,
} from '../../../apis/admin'
import { getErrorMessage } from '../../../apis/auth'
import { getRainNotice } from '../../../apis/rain-notice'
import { formatKstDateTime, KST_TIME_ZONE } from '../../../utils/kstDateTime'

// 서버의 비 예보 기준(강수확률 60% 이상이고 강수량 5mm 이상)을 넉넉히 넘는 값입니다.
const DEMO_POP = 80
const DEMO_MM = 10
const HOUR_MS = 60 * 60 * 1000
// 서버는 비 시작이 지금부터 3시간 뒤 이후일 때만 받습니다. 요청이 오가는 시간을 10분 더합니다.
const SAME_DAY_LEAD_MS = 3 * HOUR_MS + 10 * 60 * 1000

const serverTimeFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** 서버가 받는 한국 시각 문자열(2026-11-11T15:00:00)로 바꿉니다. */
function toServerTime(time: number): string {
  return serverTimeFormat.format(new Date(time)).replace(' ', 'T')
}

type RainStart = 'tomorrow' | 'today'

/** 고른 비 시작 시각. 오늘 비가 자정을 넘기면 보낼 수 없어 null을 돌려줍니다. */
function rainStartAt(option: RainStart, now: number): string | null {
  if (option === 'tomorrow') {
    return `${toServerTime(now + 24 * HOUR_MS).slice(0, 10)}T15:00:00`
  }
  const start = toServerTime(now + SAME_DAY_LEAD_MS)
  return start.slice(0, 10) === toServerTime(now).slice(0, 10) ? start : null
}

function describe(result: ForecastSimulateResult): string {
  if (result.applied === 'CONFIRMED') {
    return result.createdCount > 0
      ? `비 예보를 보냈어요. 점검 요청 ${result.createdCount}건이 만들어졌어요.`
      : '예보는 적용됐지만 만들어진 요청이 없어요. 등록된 빗물받이가 있는지 확인해 주세요.'
  }
  if (result.applied === 'UPDATED') return '같은 날 예보가 이미 있어 값만 바꿨어요. 새 요청은 만들어지지 않았어요.'
  if (result.applied === 'CANCELLED') return `예보를 취소했어요. 점검 요청 ${result.cancelledCount}건이 취소됐어요.`
  return '취소할 예보가 없어요.'
}

/**
 * 데모데이 시연 도구 (ADMIN 전용).
 * 가상 예보를 보내 점검 요청을 만들고, 지도의 '비 오는 중' 표시를 켜고 끕니다.
 */
export default function DemoToolsPanel() {
  const queryClient = useQueryClient()
  const [option, setOption] = useState<RainStart>('tomorrow')
  const [armed, setArmed] = useState(false)
  const [message, setMessage] = useState('')

  const notice = useQuery({
    queryKey: ['rain-notice'],
    queryFn: ({ signal }) => getRainNotice(signal),
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['rain-notice'] }),
    queryClient.invalidateQueries({ queryKey: ['rain-requests'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-list'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-summary'] }),
  ])

  const send = useMutation({
    mutationFn: async () => {
      const at = rainStartAt(option, Date.now())
      if (!at) throw new Error('오늘 비는 자정 전에 시작하는 일정만 보낼 수 있어요. 내일 비로 보내 주세요.')
      // 가상 예보가 남아 있으면 같은 날짜에 새 요청이 만들어지지 않으므로, 먼저 모두 취소하고 다시 보냅니다.
      await cancelSimulatedForecasts()
      return simulateForecast({ pop: DEMO_POP, mm: DEMO_MM, rainStartAt: at })
    },
    onSuccess: (result) => { setMessage(describe(result)); return refresh() },
    onSettled: () => setArmed(false),
  })

  const cancel = useMutation({
    mutationFn: cancelSimulatedForecasts,
    onSuccess: (result) => {
      setMessage(result.cancelledForecastCount > 0
        ? `가상 예보 ${result.cancelledForecastCount}건을 취소했어요. 점검 요청 ${result.cancelledRequestCount}건도 함께 취소됐어요.`
        : '취소할 가상 예보가 없어요.')
      return refresh()
    },
  })

  const rain = useMutation({
    mutationFn: (minutes: number) => simulateRain(minutes),
    onSuccess: (result) => {
      const until = formatKstDateTime(result.simulatedRainingUntil)
      setMessage(result.raining
        ? `지도에 '비 오는 중'을 켰어요.${until ? ` ${until}까지 표시돼요.` : ''}`
        : "'비 오는 중' 표시를 껐어요.")
      return refresh()
    },
  })

  const busy = send.isPending || cancel.isPending || rain.isPending
  const failed = send.error ?? cancel.error ?? rain.error
  const forecast = notice.data?.forecast
  const forecastStart = formatKstDateTime(forecast?.rainStartAt)
  const help = notice.data?.help

  return (
    <section aria-label="시연 도구" className="space-y-3">
      <p className="rounded-xl bg-[#FFF4DC] px-3 py-2.5 text-[13px] font-medium leading-5 text-[#8A6510]">
        시연용 도구예요. 비 예보를 보내면 운영 서버의 입양자 모두에게 점검 요청과 알림이 가요. 행사가 끝나면 꼭 취소해 주세요.
      </p>

      <div className="rounded-[22px] border border-[#E2EAF4] bg-white p-4">
        <h3 className="text-[15px] font-bold text-[#203451]">지금 상태</h3>
        {notice.isPending ? (
          <p role="status" className="mt-2 text-[13px] text-[#637790]">불러오는 중이에요.</p>
        ) : notice.isError ? (
          <p role="alert" className="mt-2 text-[13px] text-[#B84D4D]">{getErrorMessage(notice.error)}</p>
        ) : (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
              <dt className="text-[#637790]">비 예보</dt>
              <dd className="mt-0.5 font-bold text-[#203451]">
                {forecast
                  ? `${forecastStart ? `${forecastStart} 시작` : '시작 시각 확인 중'}${forecast.simulated ? ' (가상)' : ''}`
                  : '없음'}
              </dd>
            </div>
            <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
              <dt className="text-[#637790]">비 오는 중</dt>
              <dd className="mt-0.5 font-bold text-[#203451]">{notice.data.raining ? '켜짐' : '꺼짐'}</dd>
            </div>
            {help && (
              <div className="col-span-2 rounded-xl bg-[#F4F7FB] px-3 py-2">
                <dt className="text-[#637790]">점검 요청</dt>
                <dd className="mt-0.5 font-bold text-[#203451]">
                  도움 필요 {help.needsHelpCount} · 점검 중 {help.inProgressCount} · 완료 {help.doneCount}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="rounded-[22px] border border-[#E2EAF4] bg-white p-4">
        <h3 className="text-[15px] font-bold text-[#203451]">비 예보 보내기</h3>
        <p className="mt-1 text-[13px] leading-5 text-[#637790]">
          입양자에게 점검 요청이 가고, 입양자 없는 빗물받이는 대신 점검 대상으로 열려요. 체험자가 바뀔 때마다 다시 눌러 주세요.
        </p>

        <div role="radiogroup" aria-label="비 시작 시각" className="mt-3 grid grid-cols-2 gap-2">
          {([
            { id: 'tomorrow', label: '내일 오후 3시' },
            { id: 'today', label: '오늘 (3시간 10분 뒤)' },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={option === item.id}
              disabled={busy}
              onClick={() => { setOption(item.id); setArmed(false) }}
              className={`min-h-11 rounded-xl border px-2 text-[13px] font-bold ${
                option === item.id
                  ? 'border-[#3981F7] bg-[#EAF2FF] text-[#3981F7]'
                  : 'border-[#E2EAF4] bg-white text-[#53647E]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {armed ? (
          <div role="group" aria-label="보내기 확인" className="mt-3 rounded-xl bg-[#F4F7FB] p-3">
            <p className="text-[14px] font-bold text-[#203451]">입양자 모두에게 점검 요청이 가요. 보낼까요?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setArmed(false)}
                className="min-h-11 rounded-xl border border-[#DCE5F0] bg-white text-[14px] font-bold text-[#53647E] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setMessage(''); send.mutate() }}
                className="min-h-11 rounded-xl bg-[#3981F7] text-[14px] font-bold text-white disabled:opacity-50"
              >
                {send.isPending ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => { setMessage(''); send.reset(); setArmed(true) }}
            className="mt-3 min-h-11 w-full rounded-xl bg-[#3981F7] px-3 text-[15px] font-bold text-white disabled:opacity-50"
          >
            새 체험자에게 비 예보 보내기
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => { setMessage(''); setArmed(false); cancel.mutate() }}
          className="mt-2 min-h-11 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[14px] font-bold text-[#53647E] disabled:opacity-50"
        >
          {cancel.isPending ? '취소하는 중…' : '가상 예보 모두 취소'}
        </button>
      </div>

      <div className="rounded-[22px] border border-[#E2EAF4] bg-white p-4">
        <h3 className="text-[15px] font-bold text-[#203451]">지도에 '비 오는 중' 표시</h3>
        <p className="mt-1 text-[13px] leading-5 text-[#637790]">
          지도 배너만 바뀌어요. 점검 요청은 만들어지지 않아요.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[10, 30, 0].map((minutes) => (
            <button
              key={minutes}
              type="button"
              disabled={busy}
              onClick={() => { setMessage(''); setArmed(false); rain.mutate(minutes) }}
              className={`min-h-11 rounded-xl border px-2 text-[14px] font-bold disabled:opacity-50 ${
                minutes === 0
                  ? 'border-[#DCE5F0] bg-white text-[#53647E]'
                  : 'border-[#C6DCFF] bg-[#EAF2FF] text-[#3981F7]'
              }`}
            >
              {minutes === 0 ? '끄기' : `${minutes}분 켜기`}
            </button>
          ))}
        </div>
      </div>

      {message && <p role="status" className="rounded-xl bg-[#E5F7ED] px-3 py-2.5 text-[14px] font-bold leading-6 text-[#1F7A55]">{message}</p>}
      {failed && <p role="alert" className="rounded-xl bg-[#FFF1F1] px-3 py-2.5 text-[14px] leading-6 text-[#B84D4D]">{getErrorMessage(failed)}</p>}
    </section>
  )
}