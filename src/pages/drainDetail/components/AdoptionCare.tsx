import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getAdoptionDetail } from '../../../apis/adoptions'

const DAY_MS = 24 * 60 * 60 * 1000

function nextCheckText(days: number | null): string {
  if (days === null) return '다음 점검일을 확인하고 있어요'
  if (days > 0) return `다음 점검까지 ${days}일 남았어요`
  if (days === 0) return '오늘이 점검하는 날이에요'
  return `점검이 ${-days}일 지났어요`
}

/**
 * 내가 입양한 빗물받이의 돌봄 정보 (GET /api/v1/adoptions/{adoptionId}).
 * 다음 점검까지 남은 날, 함께한 날, 놓친 비 예보 점검을 한눈에 보여 줍니다.
 */
export default function AdoptionCare({
  adoptionId,
  isPaused,
}: {
  adoptionId: number
  isPaused: boolean
}) {
  const [now] = useState(() => Date.now())
  const { data, isError } = useQuery({
    queryKey: ['adoption-detail', adoptionId],
    queryFn: ({ signal }) => getAdoptionDetail(adoptionId, signal),
    staleTime: 30_000,
    retry: 1,
  })

  if (isError) {
    return (
      <p role="alert" className="rounded-xl bg-[#FFF4DC] p-3 text-[13px] leading-5 text-[#8A6510]">
        돌봄 정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
      </p>
    )
  }
  if (!data) return null

  const days = typeof data.daysUntilNextManagement === 'number' ? data.daysUntilNextManagement : null
  const adoptedAt = new Date(data.adoptedAt).getTime()
  const together = Number.isFinite(adoptedAt) ? Math.max(1, Math.floor((now - adoptedAt) / DAY_MS) + 1) : null
  const overdue = !isPaused && days !== null && days < 0

  return (
    <section
      aria-label="돌봄 정보"
      className="break-keep rounded-[24px] border border-[#E8EDF5] bg-white p-4 shadow-[0_4px_18px_rgba(23,43,77,0.04)]"
    >
      <h3 className="text-[15px] font-bold text-[#203451]">돌봄 정보</h3>
      <p className={`mt-2 rounded-xl px-3 py-2.5 text-[15px] font-bold leading-6 ${
        overdue ? 'bg-[#FFF4DC] text-[#8A6510]' : 'bg-[#EAF2FF] text-[#3981F7]'
      }`}>
        {isPaused ? '점검 쉬는 중' : nextCheckText(days)}
      </p>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
          <dt className="text-[#637790]">함께한 날</dt>
          <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-[#203451]">{together === null ? '—' : `${together}일째`}</dd>
        </div>
        <div className="rounded-xl bg-[#F4F7FB] px-3 py-2">
          <dt className="text-[#637790]">놓친 비 예보 점검</dt>
          <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-[#203451]">{data.missedForecastCount ?? 0}회</dd>
        </div>
      </dl>

      {!isPaused && data.releaseWarning && (
        <p className="mt-2 text-[13px] leading-5 text-[#B84D4D]">점검이 오래 밀려 있어요. 계속 밀리면 입양이 해제될 수 있어요.</p>
      )}
      {data.lonely && (
        <p className="mt-2 text-[13px] leading-5 text-[#53647E]">비 예보 점검을 여러 번 놓쳐 또랑이가 외로워하고 있어요.</p>
      )}
      {data.drain?.risk && (
        <p className="mt-2 text-[13px] leading-5 text-[#53647E]">다시 막히기 쉬운 곳이에요. 비 예보가 있으면 먼저 살펴봐 주세요.</p>
      )}
    </section>
  )
}
