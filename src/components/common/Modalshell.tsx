
import { useEffect, type ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function ModalShell({ title, onClose, children }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#17334D]/50 p-3 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mydrains-modal-title"
        className="max-h-[85dvh] w-full max-w-[450px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="mydrains-modal-title" className="font-bold text-[#24496B]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F6FB] text-xl"
          >
            ×
          </button>
        </div>

        {children}

        <p className="mt-5 text-center text-[10px] text-[#9AAFC1]">
          UI 시연용 · 서버에 저장되지 않습니다.
        </p>
      </section>
    </div>
  )
}
