import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../features/account/sanctions-warning.css'

type Props = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  closeLabel?: string
  busy?: boolean
}

export default function Sheet({
  title,
  description,
  onClose,
  children,
  footer,
  busy = false,
  className,
  closeLabel,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const sheetRef = useRef<HTMLElement>(null)
  const dragStart = useRef<number | null>(null)
  const closeRef = useRef({ onClose, busy })
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    closeRef.current = { onClose, busy }
  }, [onClose, busy])

  const dismiss = useCallback(() => {
    if (closeRef.current.busy || closingRef.current) return
    closingRef.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      closeRef.current.onClose()
    } else {
      setClosing(true)
    }
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      if (closeRef.current.busy) {
        closingRef.current = false
        setClosing(false)
        return
      }
      closeRef.current.onClose()
    }, 220)
    return () => window.clearTimeout(timer)
  }, [closing])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      const panel = sheetRef.current
      if (!panel || event.defaultPrevented || document.querySelector('dialog[open]')) return
      const focused = document.activeElement
      const activeDialog = focused?.closest('[aria-modal="true"]')
      if (activeDialog && activeDialog !== panel) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab') return

      const controls = Array.from(panel.querySelectorAll<HTMLElement>(
        'button, input:not([type="hidden"]), select, textarea, a[href], summary, [tabindex]',
      )).filter((control) =>
        control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length > 0,
      )
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !last) {
        event.preventDefault()
        panel.focus()
        return
      }
      if (
        !panel.contains(focused) ||
        (event.shiftKey && (focused === first || focused === panel)) ||
        (!event.shiftKey && focused === last)
      ) {
        event.preventDefault()
        const nextControl = event.shiftKey ? last : first
        nextControl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
    }
  }, [dismiss])

  return createPortal(
    <div
      className={['dd21-sanctions-overlay dd-shared-overlay', className].filter(Boolean).join(' ')}
      data-closing={closing}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <section
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        inert={closing}
        className="dd21-sanctions-sheet dd-shared-sheet"
      >
        <div
          className="dd21-sanctions-grab"
          aria-hidden="true"
          onPointerDown={(event) => {
            if (busy || closing || (event.pointerType === 'mouse' && event.button !== 0)) return
            dragStart.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (dragStart.current === null) return
            const distance = Math.max(0, event.clientY - dragStart.current)
            sheetRef.current?.style.setProperty('transform', 'translateY(' + distance + 'px)')
          }}
          onPointerUp={(event) => {
            if (dragStart.current === null) return
            const distance = event.clientY - dragStart.current
            dragStart.current = null
            sheetRef.current?.style.removeProperty('transform')
            if (distance > 80) dismiss()
          }}
          onPointerCancel={() => {
            dragStart.current = null
            sheetRef.current?.style.removeProperty('transform')
          }}
        >
          <span />
        </div>
        <header className="dd21-sanctions-heading shrink-0">
          <div className="min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descriptionId} className="mt-1 break-keep text-xs leading-5 text-[var(--dd-muted)]">
                {description}
              </p>
            )}
          </div>
          {closeLabel && (
            <button type="button" aria-label={closeLabel} onClick={dismiss} disabled={busy}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="m5 5 14 14M19 5 5 19" />
              </svg>
            </button>
          )}
        </header>
        <div className="dd21-sanctions-body dd-shared-body" data-has-footer={Boolean(footer)}>
          {children}
        </div>
        {footer && <footer className="dd-shared-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
