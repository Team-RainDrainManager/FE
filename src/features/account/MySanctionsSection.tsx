import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { getMySanctions, type MySanction } from '../../apis/sanctions'
import { KST_TIME_ZONE } from '../../utils/kstDateTime'
import './sanctions-warning.css'

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: KST_TIME_ZONE,
})

function getServerTimestamp(value: string | null): number {
  if (!value) return NaN
  // 서버 LocalDateTime에는 시차 표기가 없으므로 한국 시각으로 해석합니다.
  return Date.parse(LOCAL_DATE_TIME.test(value) ? `${value.replace(' ', 'T')}+09:00` : value)
}

function displayDate(value: string): string {
  const timestamp = getServerTimestamp(value)
  return Number.isFinite(timestamp) ? dateFormatter.format(timestamp) : value
}

function getSanctionStatus(sanction: MySanction, now: number): string | null {
  if (sanction.revokedAt) return '해제'
  if (sanction.status) return sanction.status
  if (sanction.active) return '진행 중'
  if (sanction.active === null) return null

  return getServerTimestamp(sanction.startedAt) > now ? '예정' : '종료'
}

export default function MySanctionsSection() {
  const { key, state } = useLocation()
  const fromNotification = (state as { openSanctions?: boolean } | null)?.openSanctions === true
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const open = openKey === key || (fromNotification && dismissedKey !== key)
  const titleId = useId()
  const startY = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const { data, dataUpdatedAt, isPending, isError, error, refetch } = useQuery({
    queryKey: ['account', 'my-sanctions'],
    queryFn: ({ signal }) => getMySanctions(signal),
    enabled: open,
  })

  const close = useCallback(() => {
    setOpenKey(null)
    setDismissedKey(key)
    startY.current = null
    setDrag(0)
    setDragging(false)
  }, [key])

  useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onEscape)
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener('keydown', onEscape) }
  }, [close, open])

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
    if (drag > 90) close()
    else setDrag(0)
  }

  return <>
    <section className="rounded-[22px] border border-[#E5EEF7] bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">내 제재 내역</h3>
        <button type="button" className="text-[11px] font-bold text-[#338CF0]" onClick={() => setOpenKey(key)}>전체 보기 <span aria-hidden="true">›</span></button>
      </div>
    </section>
    {open && createPortal(
      <div className="dd21-sanctions-overlay" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="dd21-sanctions-sheet" style={{ transform: `translateY(${drag}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}>
          <button type="button" className="dd21-sanctions-grab" aria-label="아래로 내려 닫기" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span /></button>
          <header className="dd21-sanctions-heading"><h2 id={titleId}>내 제재 내역</h2><button type="button" aria-label="닫기" onClick={close}>×</button></header>
          <div className="dd21-sanctions-body">
            {isPending && <p role="status" className="dd21-sanctions-empty">제재 내역을 불러오는 중입니다.</p>}
            {isError && <div role="alert" className="dd21-sanctions-empty"><p>{error instanceof Error ? error.message : '제재 내역을 불러오지 못했습니다.'}</p><button type="button" onClick={() => { void refetch() }}>다시 시도</button></div>}
            {!isPending && !isError && data?.length === 0 && <p className="dd21-sanctions-empty">제재 내역이 없습니다.</p>}
            {!isPending && !isError && data?.map(sanction => {
              const status = getSanctionStatus(sanction, dataUpdatedAt)
              return (
                <article className="dd21-sanctions-item" key={sanction.id}>
                  <strong className="break-words">{sanction.reason ?? sanction.type ?? '제재 기록'}</strong>
                  {status && <span>상태: {status}</span>}
                  {sanction.permanent && <span>기간: 영구</span>}
                  {sanction.type && sanction.reason && <span>유형: {sanction.type}</span>}
                  {!sanction.permanent && sanction.days !== null && <span>기간: {sanction.days}일</span>}
                  {sanction.startedAt && <span>시작: {displayDate(sanction.startedAt)}</span>}
                  {!sanction.permanent && sanction.endedAt && <span>종료: {displayDate(sanction.endedAt)}</span>}
                  {sanction.revokedAt && <span>해제: {displayDate(sanction.revokedAt)}</span>}
                  {sanction.createdAt && <span>등록: {displayDate(sanction.createdAt)}</span>}
                </article>
              )
            })}
          </div>
        </section>
      </div>, document.body,
    )}
  </>
}
