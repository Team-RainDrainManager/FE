import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SettingsPage from '../../pages/settings/SettingsPage'

/** 기존 팀원 SettingsModal을 변경하지 않고 설정 페이지를 띄우는 별도 모달 */
export default function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

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
      >
        <div className="dd-settings-modal__heading">
          <div>
            <p className="dd-settings-modal__eyebrow">MY DDORANG</p>
            <h2 id="dd-settings-modal-title">설정</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="dd-settings-modal__close"
          >✕</button>
        </div>
        <div
          className="dd-settings-modal__scroll"
          onClickCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('a[href]')) onClose()
          }}
        >
          <SettingsPage embedded />
        </div>
      </section>
    </div>,
    document.body,
  )
}
