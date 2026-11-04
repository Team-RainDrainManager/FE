import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function ModalShell({ title, onClose, children }: Props) {
  const titleId = useId()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // 페이지 및 하단 탭의 stacking context 밖에 모달을 렌더링해
  // 내비게이션에 가려지거나 잘리지 않도록 합니다.
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#17334D]/50 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[450px] max-h-[calc(100dvh-24px)] overflow-y-auto overscroll-contain rounded-[24px] bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-32px)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-bold text-[#24496B]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F6FB] text-xl"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
