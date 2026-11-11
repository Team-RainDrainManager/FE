import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { getErrorMessage } from '../../apis/auth'
import { getMyReports, getReportDetail, type ReportStatus, type ReportSummary, type ReportType } from '../../apis/reports'
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
  PENDING: '접수', APPROVED: '승인', REJECTED: '반려', CLEARED: '차단 해제',
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

function ReportDetailView({ reportId, onBack }: { reportId: number; onBack: () => void }) {
  const backButton = useRef<HTMLButtonElement>(null)
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['report-detail', reportId],
    queryFn: ({ signal }) => getReportDetail(reportId, signal),
    retry: 1,
  })

  useEffect(() => {
    backButton.current?.focus()
  }, [])

  return (
    <>
      <button
        ref={backButton}
        type="button"
        onClick={onBack}
        className="mb-3 min-h-11 rounded-xl px-2 text-sm font-bold text-[#327CDB] focus-visible:outline-2 focus-visible:outline-[#327CDB]"
      >
        <span aria-hidden="true">‹</span> 목록으로
      </button>
      {isPending && (
        <p role="status" className="dd21-sanctions-empty">제보 상세를 불러오는 중이에요.</p>
      )}
      {isError && (
        <div role="alert" className="dd21-sanctions-empty">
          <p>{getErrorMessage(error)}</p>
          <button type="button" onClick={() => void refetch()}>다시 시도</button>
        </div>
      )}
      {data && !isError && (
        <article className="dd21-sanctions-item">
          <div className="dd23-reports-row">
            <strong>{TYPE_LABELS[data.type] ?? '빗물받이 제보'}</strong>
            <span className="dd23-reports-status">{STATUS_LABELS[data.status] ?? '상태 확인 필요'}</span>
          </div>
          <span>제보 번호: {data.reportId}</span>
          <span>제보 시각: {formatReportDate(data.createdAt)}</span>
          {data.clearedAt && <span>차단 해제 시각: {formatReportDate(data.clearedAt)}</span>}
          <section className="mt-2">
            <h3 className="text-sm font-bold">제보 내용</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
              {data.description?.trim() || '입력한 내용이 없어요.'}
            </p>
          </section>
          {data.photoUrl && (
            <img
              src={data.photoUrl}
              alt="제보에 첨부한 사진"
              className="mt-2 max-h-52 w-full rounded-xl object-contain"
            />
          )}
          <section className="mt-2">
            <h3 className="text-sm font-bold">관리자 답변</h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
              {data.adminComment?.trim() || '등록된 관리자 답변이 없어요.'}
            </p>
          </section>
        </article>
      )}
    </>
  )
}

export default function MyReportsSection() {
  // 제보 결과 알림을 눌러 들어오면 내역을 바로 펼칩니다.
  const location = useLocation()
  const [open, setOpen] = useState(() => (location.state as { openReports?: boolean } | null)?.openReports === true)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)
  const titleId = useId()
  
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'me'],
    queryFn: ({ signal }) => getMyReports(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  })
  const reports = data?.reports ?? []
  const lastUpdate = newestReportTime(reports)
  const ordered = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const closeSheet = useCallback(() => {
    setOpen(false)
    setSelectedReportId(null)
    startY.current = null
    setDrag(0)
    setDragging(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(event: KeyboardEvent) { if (event.key === 'Escape') closeSheet() }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, closeSheet])

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
    if (drag > 90) {
      closeSheet()
      return
    }
    startY.current = null
    setDragging(false)
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
      <div className="dd21-sanctions-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeSheet() }}>
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="dd21-sanctions-sheet" style={{ transform: `translateY(${drag}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}>
          <button type="button" className="dd21-sanctions-grab" aria-label="아래로 내려 닫기" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}><span /></button>
          <header className="dd21-sanctions-heading">
            <h2 id={titleId}>{selectedReportId === null ? '내 제보 내역' : '제보 상세'}</h2>
            <button type="button" aria-label="닫기" onClick={closeSheet}>×</button>
          </header>
          <div key={selectedReportId ?? 'list'} className="dd21-sanctions-body dd23-reports-body">
            {selectedReportId === null ? (
              <>
                {isPending && <p role="status" className="dd21-sanctions-empty">제보 내역을 불러오는 중입니다.</p>}
                {isError && <div role="alert" className="dd21-sanctions-empty"><p>{error instanceof Error ? error.message : '제보 내역을 불러오지 못했습니다.'}</p><button type="button" onClick={() => { void refetch() }}>다시 시도</button></div>}
                {!isPending && !isError && ordered.map(item => (
                  <button
                    key={item.reportId}
                    type="button"
                    className="dd21-sanctions-item w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#327CDB]"
                    onClick={() => setSelectedReportId(item.reportId)}
                  >
                    <span className="dd23-reports-row">
                      <strong>{TYPE_LABELS[item.type] ?? '빗물받이 제보'}</strong>
                      <span className="dd23-reports-status">{STATUS_LABELS[item.status] ?? '상태 확인 필요'}</span>
                    </span>
                    <span>제보 번호: {item.reportId}</span>
                    <span className="dd23-reports-row">
                      <span>제보 시각: {formatReportDate(item.createdAt)}</span>
                      <span aria-hidden="true">›</span>
                    </span>
                  </button>
                ))}              
                {!isPending && !isError && reports.length === 0 && (
  <p className="dd21-sanctions-empty">제보 내역이 없어요</p>
)}              
              </>
            ) : (
              <ReportDetailView reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />
            )}
          </div>
        </section>
      </div>, document.body,
    )}
  </>
}
