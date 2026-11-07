import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import '../nickname/nickname-dialog.css'

export type NicknameReport = {
  id: string
  targetId: string
  nickname: string
  createdAt: string
  status: 'pending-demo'
}
const REPORTS_KEY = 'ddorang:demo-nickname-reports'

/** 백엔드 신고 API가 없어 이 브라우저에만 저장하는 UI 시연입니다. */
function storeDemoReport(targetId: string, nickname: string): boolean {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]')
    const previous = Array.isArray(saved) ? saved.filter((item): item is NicknameReport => Boolean(item && typeof item === 'object')) : []
    const next: NicknameReport = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, targetId, nickname, createdAt: new Date().toISOString(), status: 'pending-demo' }
    localStorage.setItem(REPORTS_KEY, JSON.stringify([...previous, next].slice(-100)))
    return true
  } catch { return false }
}

export default function ReportableNickname({ targetId, nickname, isMe = false }: { targetId: string; nickname: string; isMe?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downPoint = useRef<{x: number; y: number} | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timeout)
  }, [notice])

  function clearPress() { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; downPoint.current = null }
  function startPress(event: ReactPointerEvent<HTMLSpanElement>) {
    if (isMe || event.button !== 0) return
    clearPress()
    downPoint.current = { x: event.clientX, y: event.clientY }
    timer.current = setTimeout(() => { setReportOpen(true); clearPress() }, 550)
  }
  function movePress(event: ReactPointerEvent<HTMLSpanElement>) {
    const initial = downPoint.current
    if (initial && Math.hypot(event.clientX - initial.x, event.clientY - initial.y) > 9) clearPress()
  }
  const label = isMe ? nickname : `${nickname} 닉네임 신고하기 (길게 누르기)`
  return <>
    <span
      className={isMe ? '' : 'dd-reportable-name'}
      role={isMe ? undefined : 'button'}
      tabIndex={isMe ? undefined : 0}
      aria-label={label}
      onPointerDown={startPress}
      onPointerMove={movePress}
      onPointerUp={clearPress}
      onPointerCancel={clearPress}
      onPointerLeave={clearPress}
      onContextMenu={event => { if (!isMe) { event.preventDefault(); clearPress(); setReportOpen(true) } }}
      onKeyDown={event => { if (!isMe && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setReportOpen(true) } }}
    >{nickname}</span>
    {reportOpen && createPortal(<div className="dd-nick-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReportOpen(false) }}>
      <section className="dd-nick-dialog" role="dialog" aria-modal="true" aria-label="닉네임 신고하기">
        <div className="dd-nick-heading"><h2>닉네임 신고하기</h2><button type="button" className="dd-nick-close" aria-label="닫기" onClick={() => setReportOpen(false)}>×</button></div>
        <div className="dd-nick-flow">
          <p className="dd-nick-notice">{nickname} 님의 닉네임을 신고하시겠습니까?</p>
          <p className="dd-nick-disclaimer">현재는 UI 시연 단계입니다. 신고는 이 브라우저에만 저장되며 관리자 서버로 전송되지 않습니다.</p>
          <button type="button" className="dd-nick-primary" onClick={() => {
            const saved = storeDemoReport(targetId, nickname)
            setReportOpen(false)
            setNotice(saved ? '시연용 신고를 이 브라우저에 저장했습니다.' : '신고 시연을 저장하지 못했습니다.')
          }}>신고</button>
        </div>
      </section>
    </div>, document.body)}
    {notice && createPortal(<div className="dd-nick-toast" role="status">{notice}</div>, document.body)}
  </>
}
