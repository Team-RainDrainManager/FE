import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import Sheet from '../../components/common/Sheet'
import { getMySanctions } from '../../apis/sanctions'

function displayDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul', hour12: false,
  }).format(parsed)
}

export default function MySanctionsSection() {
  const location = useLocation()
  const [open, setOpen] = useState(
    () => (location.state as { openSanctions?: boolean } | null)?.openSanctions === true,
  )
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['account', 'my-sanctions'],
    queryFn: ({ signal }) => getMySanctions(signal),
    enabled: open,
    staleTime: 15_000,
  })

  return <>
    <section className="rounded-[22px] border border-[#E5EEF7] bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">내 제재 내역</h3>
        <button type="button" className="text-[11px] font-bold text-[#338CF0]" onClick={() => setOpen(true)}>전체 보기 <span aria-hidden="true">›</span></button>
      </div>
    </section>
    {open && (
      <Sheet title="내 제재 내역" onClose={() => setOpen(false)}>
        {isPending && <p role="status" className="dd21-sanctions-empty">제재 내역을 불러오는 중입니다.</p>}
        {isError && <div role="alert" className="dd21-sanctions-empty"><p>{error instanceof Error ? error.message : '제재 내역을 불러오지 못했습니다.'}</p><button type="button" onClick={() => { void refetch() }}>다시 시도</button></div>}
        {!isPending && !isError && data?.length === 0 && <p className="dd21-sanctions-empty">제재 내역이 없습니다.</p>}
        {!isPending && !isError && data?.map(sanction => <article className="dd21-sanctions-item" key={sanction.id}>
          <strong>{sanction.reason ?? sanction.type ?? '제재 기록'}</strong>
          {sanction.status && <span>상태: {sanction.status}</span>}
          {sanction.type && sanction.reason && <span>유형: {sanction.type}</span>}
          {sanction.days !== null && <span>기간: {sanction.days}일</span>}
          {sanction.startedAt && <span>시작: {displayDate(sanction.startedAt)}</span>}
          {sanction.endedAt && <span>종료: {displayDate(sanction.endedAt)}</span>}
          {sanction.createdAt && <span>등록: {displayDate(sanction.createdAt)}</span>}
        </article>)}
      </Sheet>
    )}
  </>
}
