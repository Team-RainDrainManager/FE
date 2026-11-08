import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { getMySanctions } from '../../apis/sanctions'
import './sanctions-warning.css'

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
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const startY = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['account', 'my-sanctions'],
    queryFn: ({ signal }) => getMySanctions(signal),
    enabled: open,
    staleTime: 15_000,
  })

  useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onEscape)
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', onEscape) }
  }, [open])

  function onDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startY.current = event.clientY
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onMove(event: PointerEvent<HTMLButtonElement>) {
    if (startY.current === null) return
    setDrag(Math.max(0, event.clientY - startY.current))
  }
  function onUp() {
    if (startY.current === null) return
    startY.current = null
    setDragging(false)
    if (drag > 90) { setOpen(false); setDrag(0) }
    else setDrag(0)
  }

  return <>
    <section className="rounded-[22px] border border-[#E5EEF7] bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">내 제재 내역</h3>
        <button type="button" className="text-[11px] font-bold text-[#338CF0]" onClick={() => setOpen(true)}>전체 보기 <span aria-hidden="true">›</span></button>
      </div>
    </section>
    {open && createPortal(
      <div className="dd21-sanctions-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="dd21-sanctions-sheet" style={{ transform: `translateY(${drag}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}>
          <button type="button" className="dd21-sanctions-grab" aria-label="아래로 내려 닫기" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span /></button>
          <header className="dd21-sanctions-heading"><h2 id={titleId}>내 제재 내역</h2><button type="button" aria-label="닫기" onClick={() => setOpen(false)}>×</button></header>
          <div className="dd21-sanctions-body">
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
          </div>
        </section>
      </div>, document.body,
    )}
  </>
}
