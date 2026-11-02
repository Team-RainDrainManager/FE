import { useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

type TermKind = 'terms' | 'privacy'
type View = 'settings' | 'pause' | 'logout' | 'withdraw' | TermKind

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  notificationsEnabled: boolean
  onNotificationsChange: (enabled: boolean) => Promise<void>
  pause: {
    canApply: boolean
    activeUntil: string | null
    nextAvailableAt: string | null
  }
  onApplyPause: () => Promise<void>
  onLoadTerms: (kind: TermKind) => Promise<string>
  onLogout: () => Promise<void>
  onWithdraw: () => Promise<void>
  version?: string
}

function Icon({ name, className = '' }: { name: 'bell' | 'pause' | 'file' | 'shield' | 'logout' | 'trash' | 'close' | 'back' | 'chevron'; className?: string }) {
  const paths: Record<typeof name, ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
    pause: <><circle cx="12" cy="12" r="9" /><path d="M9 8v8m6-8v8" /></>,
    file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z" /><path d="M14 3v5h5M8 12h8m-8 4h6" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    logout: <><path d="M10 4H5v16h5m4-12 4 4-4 4m-5-4h12" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    back: <path d="m15 5-7 7 7 7" />,
    chevron: <path d="m9 5 7 7-7 7" />,
  }
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul',
})
function formatDate(value: string) { return dateFormatter.format(new Date(value)) }

/** 기본 사용 위치: src/components/settings/SettingsModal.tsx
 * API 콜백은 실패 시 throw 해야 오류가 표시됩니다.
 * onApplyPause 성공 후 부모에서 pause 상태를 새로 조회해 주세요.
 * onLogout/onWithdraw 성공 후 부모에서 인증 정보 정리 및 로그인 화면 이동을 처리하세요.
 */
export default function SettingsModal({
  isOpen, onClose, notificationsEnabled, onNotificationsChange, pause,
  onApplyPause, onLoadTerms, onLogout, onWithdraw, version,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)
  const closingRef = useRef(false)
  const dragStartRef = useRef<number | null>(null)
  const titleId = useId()
  const [view, setView] = useState<View>('settings')
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [termContent, setTermContent] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current)
      dialog.close()
      return
    }
    // Native dialog가 배경 접근 차단, 포커스 가두기·복원을 처리합니다.
    dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (timerRef.current) clearTimeout(timerRef.current)
      dialog.close()
    }
  }, [isOpen])

  // Hooks lint와 재열기 초기화를 위해 부모는 isOpen일 때만 마운트해도 됩니다.
  function close() {
    if (busyRef.current || closingRef.current) return
    closingRef.current = true
    setClosing(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    timerRef.current = setTimeout(() => {
      dialogRef.current?.close()
      closingRef.current = false
      setClosing(false)
      setView('settings')
      setError('')
      setNotice('')
      setTermContent('')
      setDrag(0)
      onClose()
    }, reduced ? 0 : 220)
  }

  function goTo(next: View) {
    if (busyRef.current) return
    setView(next)
    setError('')
    setNotice('')
    closeButtonRef.current?.focus()
  }

  async function run(action: () => Promise<void>, success?: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (success) {
        setNotice(success)
        setView('settings')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function openTerms(kind: TermKind) {
    goTo(kind)
    setTermContent('')
    void run(async () => {
      const text = await onLoadTerms(kind)
      setTermContent(text)
    })
  }

  function onDragStart(event: PointerEvent<HTMLElement>) {
    if (busyRef.current || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    dragStartRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const title = { settings: '설정', pause: '점검 쉬기', logout: '로그아웃', withdraw: '회원 탈퇴', terms: '이용약관', privacy: '개인정보 처리방침' }[view]
  const rowClass = 'flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-left text-sm font-medium transition-colors hover:bg-[#F6F8FC] focus-visible:outline-2 focus-visible:outline-[#6085ED] disabled:opacity-50'
  const primaryClass = 'min-h-11 flex-1 rounded-xl bg-[#6085ED] px-4 text-sm font-bold text-white hover:bg-[#5075DD] disabled:opacity-50'
  const secondaryClass = 'min-h-11 flex-1 rounded-xl border border-[#DFE6F0] px-4 text-sm font-semibold text-[#637790] hover:bg-[#F6F8FC] disabled:opacity-50'

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-busy={busy}
      data-closing={closing || undefined}
      className="ttorang-settings fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-[#203451] outline-none"
      onCancel={(event) => { event.preventDefault(); close() }}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      <style>{`
  .ttorang-settings::backdrop {
    background: rgb(20 34 55 / .38);
    animation: ttorang-settings-fade 220ms ease-out both;
  }

  .ttorang-settings[open] {
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .ttorang-settings .ttorang-settings-sheet {
    animation: ttorang-settings-rise 280ms
      cubic-bezier(.22, 1, .36, 1) both;
  }

  .ttorang-settings[data-closing]::backdrop {
    animation: ttorang-settings-fade 220ms ease-in reverse both;
  }

  .ttorang-settings[data-closing] .ttorang-settings-sheet {
    animation: ttorang-settings-rise 220ms ease-in reverse both;
  }

  @keyframes ttorang-settings-rise {
    from {
      transform: translateY(48px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes ttorang-settings-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ttorang-settings::backdrop,
    .ttorang-settings .ttorang-settings-sheet {
      animation: none !important;
    }
  }
`}</style>
      <section className="ttorang-settings-sheet flex max-h-[72dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-8px_40px_rgba(20,34,55,0.08)]"
        style={{ translate: `0 ${drag}px` }}>
        <header className="shrink-0 touch-none px-5 pb-2 pt-3"
          onPointerDown={onDragStart}
          onPointerMove={(event) => { if (dragStartRef.current !== null) setDrag(Math.max(0, event.clientY - dragStartRef.current)) }}
          onPointerUp={(event) => {
            if (dragStartRef.current === null) return
            const distance = event.clientY - dragStartRef.current
            dragStartRef.current = null
            if (distance > 80) close()
            setDrag(0)
          }}
          onPointerCancel={() => { dragStartRef.current = null; setDrag(0) }}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D8DEE8]" aria-hidden="true" />
          <div className="flex min-h-11 items-center gap-1">
            {view !== 'settings' && <button type="button" aria-label="설정으로 돌아가기" disabled={busy} onClick={() => goTo('settings')} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[#F6F8FC] disabled:opacity-50"><Icon name="back" /></button>}
            <h2 id={titleId} className="flex-1 text-xl font-bold tracking-tight">{title}</h2>
            <button ref={closeButtonRef} type="button" autoFocus aria-label="설정 닫기" disabled={busy} onClick={close} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-[#8795AB] hover:bg-[#F6F8FC] disabled:opacity-50"><Icon name="close" /></button>
          </div>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="mb-3 rounded-xl bg-[#FFF2F2] p-3 text-xs leading-5 text-[#C65A62]">{error}</p>}
          {notice && <p role="status" className="mb-3 rounded-xl bg-[#EDF4FF] p-3 text-xs leading-5 text-[#517BDE]">{notice}</p>}
          {view === 'settings' && <>
            <h3 className="mt-3 text-xs font-semibold text-[#8C9AB0]">알림</h3>
            <div className="flex min-h-14 items-center gap-3 px-1">
              <Icon name="bell" className="shrink-0 text-[#637790]" />
              <span className="flex-1 text-sm font-medium">알림 받기</span>
              <button type="button" role="switch" aria-label="알림 받기" aria-checked={notificationsEnabled} disabled={busy}
                onClick={() => void run(() => onNotificationsChange(!notificationsEnabled))}
                className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-[#6085ED] disabled:opacity-50">
                <span className={`relative block h-7 w-12 rounded-full transition-colors ${notificationsEnabled ? 'bg-[#6085ED]' : 'bg-[#D8DFE9]'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} /></span>
              </button>
            </div>
            <div className="my-3 border-t border-[#EDF1F6]" />
            <h3 className="text-xs font-semibold text-[#8C9AB0]">돌봄 관리</h3>
            <button type="button" className={rowClass} disabled={busy || !pause.canApply || Boolean(pause.activeUntil)} onClick={() => goTo('pause')}>
              <Icon name="pause" className="shrink-0 text-[#637790]" /><span className="flex-1">점검 쉬기</span>
              <span className="text-xs font-semibold text-[#6085ED]">{pause.activeUntil ? '쉬는 중' : pause.canApply ? '신청하기' : '신청 불가'}</span>
              {pause.canApply && !pause.activeUntil && <Icon name="chevron" className="h-4 w-4 text-[#6085ED]" />}
            </button>
            <div className="rounded-xl bg-[#F5F7FB] px-3 py-2.5 text-xs leading-5 text-[#8795AB]">
              {pause.activeUntil ? <p>{formatDate(pause.activeUntil)}까지 쉬는 중이에요.</p> : <p>14일 동안 정기 점검을 쉬어요.</p>}
              <p>비 예보 점검 요청은 계속 받아요.</p>
              {!pause.canApply && !pause.activeUntil && <p>{pause.nextAvailableAt ? `${formatDate(pause.nextAvailableAt)}부터 다시 신청할 수 있어요.` : '입양 여부와 신청 가능 상태를 확인해 주세요.'}</p>}
            </div>
            <h3 className="mb-1 mt-5 text-xs font-semibold text-[#8C9AB0]">이용 안내</h3>
            <div className="divide-y divide-[#EDF1F6]">
              <button type="button" disabled={busy} className={rowClass} onClick={() => openTerms('terms')}><Icon name="file" className="text-[#637790]" /><span className="flex-1">이용약관</span><Icon name="chevron" className="h-4 w-4 text-[#98A6BB]" /></button>
              <button type="button" disabled={busy} className={rowClass} onClick={() => openTerms('privacy')}><Icon name="shield" className="text-[#637790]" /><span className="flex-1">개인정보 처리방침</span><Icon name="chevron" className="h-4 w-4 text-[#98A6BB]" /></button>
            </div>
            <div className="my-3 border-t border-[#EDF1F6]" />
            <button type="button" disabled={busy} className={`${rowClass} text-[#637790]`} onClick={() => goTo('logout')}><Icon name="logout" /><span className="flex-1">로그아웃</span><Icon name="chevron" className="h-4 w-4 text-[#98A6BB]" /></button>
            <button type="button" disabled={busy} className={`${rowClass} text-[#D46B75]`} onClick={() => goTo('withdraw')}><Icon name="trash" /><span className="flex-1">회원 탈퇴</span><Icon name="chevron" className="h-4 w-4 text-[#98A6BB]" /></button>
            <p className="mt-3 text-center text-[10px] text-[#A5B1C1]">또랑{version ? ` · 버전 ${version}` : ''}</p>
          </>}
          {(view === 'terms' || view === 'privacy') && <div className="min-h-48 py-3">
            {busy ? <p role="status" className="text-sm text-[#8795AB]">불러오는 중이에요…</p> : termContent ? <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#637790]">{termContent}</p> : <button type="button" className="min-h-11 text-sm text-[#6085ED]" onClick={() => openTerms(view)}>다시 불러오기</button>}
          </div>}
          {(view === 'pause' || view === 'logout' || view === 'withdraw') && <div className="pb-2 pt-4">
            <h3 className="text-base font-bold">{view === 'pause' ? '잠시 돌봄을 쉬어갈까요?' : view === 'logout' ? '로그아웃할까요?' : '정말 탈퇴하시겠어요?'}</h3>
            <p className="mt-3 text-sm leading-6 text-[#8795AB]">{view === 'pause' ? '14일 동안 정기 점검과 자동 입양 해제가 보류돼요. 비 예보 점검 요청은 계속 받아요. 다음 신청은 90일이 지난 뒤 가능해요.' : view === 'logout' ? '다시 로그인하면 또랑을 계속 이용할 수 있어요.' : '진행 중인 입양이 해제돼요. 탈퇴하면 되돌릴 수 없으니 신중히 선택해 주세요.'}</p>
            <div className="mt-6 flex gap-2">
              <button type="button" disabled={busy} className={secondaryClass} onClick={() => goTo('settings')}>취소</button>
              <button type="button" disabled={busy || (view === 'pause' && (!pause.canApply || Boolean(pause.activeUntil)))}
                className={view === 'withdraw' ? 'min-h-11 flex-1 rounded-xl bg-[#D46B75] px-4 text-sm font-bold text-white hover:bg-[#C45B65] disabled:opacity-50' : primaryClass}
                onClick={() => void run(async () => {
                  if (view === 'pause') await onApplyPause()
                  else {
                    if (view === 'logout') await onLogout()
                    else await onWithdraw()
                    // 인증 정리가 완료된 후에만 모달을 닫습니다.
                    dialogRef.current?.close()
                    onClose()
                  }
                }, view === 'pause' ? '14일간 점검 쉬기를 신청했어요.' : undefined)}>
                {busy ? '처리 중…' : view === 'pause' ? '쉬기 신청' : view === 'logout' ? '로그아웃' : '탈퇴하기'}
              </button>
            </div>
          </div>}
        </div>
      </section>
    </dialog>, document.body,
  )
}

/** 목데이터 미리보기. 실제 서비스에서는 위 SettingsModal에 API 콜백을 전달하세요.
 * 헤더의 기존 설정 버튼 자리에 <SettingsModalDemo />를 넣으면 확인할 수 있습니다.
 * 로그아웃·탈퇴 버튼은 실제 계정에 영향을 주지 않습니다.
 */
export function SettingsModalDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [pauseUntil, setPauseUntil] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  return <>
    <button type="button" aria-label="설정 열기" onClick={() => { setMessage(''); setIsOpen(true) }}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-[#203451] hover:bg-[#F0F4FB] focus-visible:outline-2 focus-visible:outline-[#6085ED]">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 3-.5 2-2 1-2-.5L2 10l1.5 1.5v2L2 15l2.5 4.5 2-.5 2 1 .5 2h6l.5-2 2-1 2 .5L22 15l-1.5-1.5v-2L22 10l-2.5-4.5-2 .5-2-1L15 3Z" />
        <circle cx="12" cy="12.5" r="3.5" />
      </svg>
    </button>
    {message && <p role="status" className="text-xs text-[#637790]">{message}</p>}
    {isOpen && <SettingsModal isOpen onClose={() => setIsOpen(false)}
      notificationsEnabled={notificationsEnabled}
      onNotificationsChange={(enabled) => { setNotificationsEnabled(enabled); return Promise.resolve() }}
      pause={{ canApply: !pauseUntil, activeUntil: pauseUntil, nextAvailableAt: null }}
      onApplyPause={() => {
        const date = new Date()
        date.setDate(date.getDate() + 14)
        setPauseUntil(date.toISOString())
        return Promise.resolve()
      }}
      onLoadTerms={(kind) => Promise.resolve(kind === 'terms'
        ? '이용약관 미리보기입니다.\n\n실제 서비스에서는 약관 목록에서 해당 ID를 확인하고 약관 전문 조회 API로 받은 내용을 표시해 주세요.'
        : '개인정보 처리방침 미리보기입니다.\n\n이 문구는 실제 처리방침이 아닙니다. 서비스에서 제공하는 전문으로 교체해 주세요.')}
      onLogout={() => { setMessage('로그아웃 동작을 확인했어요. (목데이터)'); return Promise.resolve() }}
      onWithdraw={() => { setMessage('탈퇴 동작을 확인했어요. (목데이터)'); return Promise.resolve() }}
    />}
  </>
}
/*
 * TODO: 설정 모달 API 연결
 * 공통 응답: { success, data, error }
 * 인증 필요 API: Authorization: Bearer {accessToken}
 *
 * 1. 모달 열 때
 * GET /api/v1/users/me/settings
 * → 알림 설정을 notificationsEnabled에 반영
 *
 * GET /api/v1/users/me/pause
 * → pause에 canApply, activeUntil, nextAvailableAt 반영
 * → 14일 기간·90일 재신청 제한은 서버에서 계산
 *
 * 2. onNotificationsChange(enabled)
 * PATCH /api/v1/users/me/settings
 * → 요청 필드명은 최신 Swagger 확인
 * → 성공 후 토글 상태 반영, 실패 시 기존 상태 유지
 * → 알림 설정 변경과 FCM 토큰 등록·삭제는 별도 처리 여부 확인
 *
 * 3. onApplyPause()
 * POST /api/v1/users/me/pause
 * → 성공 후 GET /api/v1/users/me/pause 재조회
 * → 설정 모달과 또랑이 카드가 같은 쉬기 상태를 사용하도록 연결
 * → activeUntil이 현재보다 미래일 때만 '쉬는 중' 표시
 *
 * 4. onLoadTerms(kind)
 * GET /api/v1/terms
 * → 이용약관·개인정보 관련 항목의 termsId 확인
 * GET /api/v1/terms/{termsId}
 * → 전문 문자열 반환
 * → 개인정보 처리방침 제공 여부·응답 필드명 확인
 * → 약관 ID를 임의로 하드코딩하지 않기
 *
 * 5. onLogout()
 * POST /api/v1/auth/logout
 * → body: { refreshToken }
 * → 성공 후 인증 정보·사용자 캐시 정리
 * → /login으로 이동 (replace: true)
 *
 * 6. onWithdraw()
 * DELETE /api/v1/users/me
 * → 탈퇴 확인 후 호출
 * → 성공 후 인증 정보·사용자 캐시 정리
 * → /login으로 이동 (replace: true)
 *
 * 연결 시 SettingsModalDemo 대신 SettingsModal 사용
 * 각 콜백에서 API 실패 시 throw하여 모달에 오류 표시
 * 실제 API 연결 후 목데이터·시연용 날짜 계산 제거
 */