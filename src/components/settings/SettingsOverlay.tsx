import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import SettingsPage from '../../pages/settings/SettingsPage'

/** 사용자가 담당하는 설정 화면 전용 모바일 바텀 시트. 기존 SettingsModal 원본은 유지합니다. */
export default function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const reportTriggerRef = useRef<HTMLButtonElement>(null)
  const pointerStartRef = useRef<number | null>(null)
  // Real touch uses native inertial scrolling. Mouse drag is only a fallback
  // for mobile-size Chrome DevTools previews on a desktop.
  const mouseScrollRef = useRef<{
    pointerId: number
    startY: number
    startScrollTop: number
  } | null>(null)
  const movedRef = useRef(0)
  const ignoreClickRef = useRef(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStartRef.current = event.clientY
    movedRef.current = 0
    ignoreClickRef.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (pointerStartRef.current === null) return
    const distance = Math.max(0, event.clientY - pointerStartRef.current)
    movedRef.current = distance
    setDragY(distance)
  }

  function finishDrag() {
    if (pointerStartRef.current === null) return
    const distance = movedRef.current
    ignoreClickRef.current = distance > 8
    pointerStartRef.current = null
    movedRef.current = 0
    setDragging(false)
    if (distance > 90) onClose()
    else setDragY(0)
  }

  function cancelDrag() {
    pointerStartRef.current = null
    movedRef.current = 0
    ignoreClickRef.current = false
    setDragging(false)
    setDragY(0)
  }

  function startContentDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if (!window.matchMedia('(max-width: 719px)').matches) return
    if (event.target instanceof Element && event.target.closest(
      'button, a, input, textarea, select, summary, [role="button"], [role="radio"], [role="switch"], [role="tab"], [contenteditable="true"]',
    )) return
    mouseScrollRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: event.currentTarget.scrollTop,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveContentDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = mouseScrollRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const delta = event.clientY - gesture.startY
    if (Math.abs(delta) < 3) return
    event.currentTarget.scrollTop = gesture.startScrollTop - delta
  }

  function endContentDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = mouseScrollRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    mouseScrollRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return createPortal(
    <div
      className="dd-settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="dd-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dd-settings-modal-title"
        style={{
          translate: `0 ${dragY}px`,
          transition: dragging ? 'none' : 'translate 220ms cubic-bezier(.2,.75,.25,1)',
        }}
      >
        <button
          type="button"
          className="dd-settings-modal__grab"
          aria-label="설정 닫기: 아래로 밀거나 누르세요"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onClick={() => {
            if (ignoreClickRef.current) {
              ignoreClickRef.current = false
              return
            }
            onClose()
          }}
        >
          <span className="dd-settings-modal__grab-indicator" aria-hidden="true" />
        </button>
        <div className="dd-settings-modal__heading">
          <div>
            <p className="dd-settings-modal__eyebrow">MY DDORANG</p>
            <h2 ref={titleRef} tabIndex={-1} id="dd-settings-modal-title">설정</h2>
          </div>
          <button type="button" className="dd-settings-modal__report" aria-label="버그 신고하기" title="버그 신고"
            onClick={() => reportTriggerRef.current?.click()}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 17v-7a6 6 0 0 1 12 0v7M4 20h16M8 17h8M12 1v2M4.5 5l1.5 1.5M19.5 5L18 6.5" />
            </svg>
          </button>
        </div>
        <div
          className="dd-settings-modal__scroll"
          onPointerDown={startContentDrag}
          onPointerMove={moveContentDrag}
          onPointerUp={endContentDrag}
          onPointerCancel={endContentDrag}
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('a[href]')) onClose()
          }}
        >
          <SettingsPage embedded reportButtonRef={reportTriggerRef} />
        </div>
      </section>
    </div>,
    document.body,
  )
}
