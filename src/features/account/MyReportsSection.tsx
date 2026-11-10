import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { getMyReports, type ReportStatus, type ReportSummary, type ReportType } from '../../apis/reports'
import './sanctions-warning.css'
import './report-history.css'

const TYPE_LABELS: Record<ReportType, string> = {
  BLOCKAGE: '막힘 제보',
  NEW_DRAIN: '신규 빗물받이 제보',
  LOCATION_FIX: '위치 정정',
  REMOVAL: '빗물받이 철거 제보',
  ODOR: '악취 제보',
}
const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '접수', APPROVED: '승인', REJECTED: '반려',
}

/** 서버에서 받은 제보 시각을 한국 표준시 YYYY/MM/DD HH:mm 형태로 표시합니다. */
function formatReportDate(value: string): string {
  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return '시간 확인 필요'
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul',
  }).formatToParts(timestamp)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}

function newestReportTime(reports: ReportSummary[]): string | null {
  const times = reports.map(item => new Date(item.createdAt).getTime()).filter(Number.isFinite)
  if (!times.length) return null
  return new Date(Math.max(...times)).toISOString()
}

export default function MyReportsSection() {
  // 제보 결과 알림을 눌러 들어오면 내역을 바로 펼칩니다.
  const location = useLocation()
  const [open, setOpen] = useState(() => (location.state as { openReports?: boolean } | null)?.openReports === true)
  const [showExample, setShowExample] = useState(false)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)
  const titleId = useId()
  const toggleId = useId()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'me'],
    queryFn: ({ signal }) => getMyReports(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  })
  const reports = data?.reports ?? []
  const lastUpdate = newestReportTime(reports)
  const ordered = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', handleKey)
    }
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
    if (drag > 90) setOpen(false)
    setDrag(0)
  }
  function openSheet() {
    setOpen(true)
    void refetch()
  }

  return <>
    <section className="dd23-reports-summary rounded-[22px] border border-[#E5EEF7] bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold">내 제보 내역 <span className="dd23-reports-count">{isError || isPending ? '—' : `${reports.length}개`}</span></h3>
          <p className="dd23-reports-updated">last update : {isError || isPending || !lastUpdate ? '—' : formatReportDate(lastUpdate)}</p>
        </div>
        <button type="button" className="dd23-reports-open shrink-0 text-[11px] font-bold text-[#338CF0]" onClick={openSheet}>전체 보기 <span aria-hidden="true">›</span></button>
      </div>
      {isError && <p className="dd23-reports-error" role="status">제보 내역을 불러오지 못했습니다.</p>}
    </section>
    {open && createPortal(
      <div className="dd21-sanctions-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="dd21-sanctions-sheet" style={{ transform: `translateY(${drag}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}>
          <button type="button" className="dd21-sanctions-grab" aria-label="아래로 내려 닫기" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span /></button>
          <header className="dd21-sanctions-heading"><h2 id={titleId}>내 제보 내역</h2><button type="button" aria-label="닫기" onClick={() => setOpen(false)}>×</button></header>
          <div className="dd21-sanctions-body dd23-reports-body">
            {isPending && <p role="status" className="dd21-sanctions-empty">제보 내역을 불러오는 중입니다.</p>}
            {isError && <div role="alert" className="dd21-sanctions-empty"><p>{error instanceof Error ? error.message : '제보 내역을 불러오지 못했습니다.'}</p><button type="button" onClick={() => { void refetch() }}>다시 시도</button></div>}
            {!isPending && !isError && ordered.map(item => <article key={item.reportId} className="dd21-sanctions-item">
              <div className="dd23-reports-row"><strong>{TYPE_LABELS[item.type] ?? '빗물받이 제보'}</strong><span className="dd23-reports-status">{STATUS_LABELS[item.status] ?? item.status}</span></div>
              <span>제보 번호: {item.reportId}</span>
              <span>제보 시각: {formatReportDate(item.createdAt)}</span>
            </article>)}
            {!isPending && !isError && showExample && <article className="dd21-sanctions-item"><strong>제보 내역 예시</strong><span>시연 전용 · 서버에 저장되지 않습니다.</span></article>}
            {!isPending && !isError && reports.length === 0 && !showExample && <p className="dd21-sanctions-empty">제보 내역이 없어요</p>}
            <label htmlFor={toggleId} className="dd23-reports-toggle"><span>제보 내역 표시 여부 시연</span><input id={toggleId} type="checkbox" checked={showExample} onChange={event => setShowExample(event.target.checked)} role="switch" /></label>
          </div>
        </section>
      </div>, document.body,
    )}
  </>
}
