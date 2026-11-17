import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type MouseEventHandler } from 'react'
import { createPortal } from 'react-dom'
import '../../features/account/sanctions-warning.css'

// Nested sheets share one overflow lock, even when closed in a different order.
const openSheets: HTMLElement[] = []
let savedBodyOverflow = ''

type Props = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  closeLabel?: string
  busy?: boolean
  dismissible?: boolean
  onContentClickCapture?: MouseEventHandler<HTMLDivElement>
  heading?: ReactNode
  appearance?: { overlay: string; panel: string; grab: string; indicator: string; body: string }
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
  dismissible = true,
  heading,
  appearance,
  onContentClickCapture,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()
  const sheetRef = useRef<HTMLElement>(null)
  const dragged = useRef(false)
  const dragStart = useRef<number | null>(null)
  const closeRef = useRef({ onClose, busy, dismissible })
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    closeRef.current = { onClose, busy, dismissible }
  }, [onClose, busy, dismissible])

  const dismiss = useCallback(() => {
    if (!closeRef.current.dismissible || closeRef.current.busy || closingRef.current) return
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
      if (closeRef.current.busy || !closeRef.current.dismissible) {
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
    const panel = sheetRef.current
    if (!panel) return
    if (openSheets.length === 0) savedBodyOverflow = document.body.style.overflow
    openSheets.push(panel)
    document.body.style.overflow = 'hidden'
    panel.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      const panel = sheetRef.current
      if (!panel || openSheets.at(-1) !== panel || event.defaultPrevented || document.querySelector('dialog[open]')) return
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
      const index = openSheets.indexOf(panel)
      if (index !== -1) openSheets.splice(index, 1)
      document.body.style.overflow = openSheets.length ? 'hidden' : savedBodyOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      } else {
        openSheets.at(-1)?.focus({ preventScroll: true })
      }
    }
  }, [dismiss])

  return createPortal(
    <div
      className={[appearance?.overlay ?? 'dd21-sanctions-overlay', 'dd-shared-overlay', className].filter(Boolean).join(' ')}
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
        aria-labelledby={heading ? undefined : titleId}
        aria-label={heading ? title : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy}
        inert={closing}
        className={[appearance?.panel ?? 'dd21-sanctions-sheet', 'dd-shared-sheet'].join(' ')}
      >
        <button
          type="button"
          className={appearance?.grab ?? "dd21-sanctions-grab"}
          aria-label="아래로 밀거나 눌러 닫기"
          disabled={busy || !dismissible}
          onClick={() => { if (!dragged.current) dismiss(); dragged.current = false }}
          onPointerDown={(event) => {
            if (!dismissible || busy || closing || (event.pointerType === 'mouse' && event.button !== 0)) return
            dragged.current = false
            dragStart.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (dragStart.current === null) return
            const distance = Math.max(0, event.clientY - dragStart.current)
            if (distance > 8) dragged.current = true
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
          <span className={appearance?.indicator} />
        </button>
        {heading ?? <header className="dd21-sanctions-heading shrink-0">
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
        </header>}
        <div className={[appearance?.body ?? 'dd21-sanctions-body', 'dd-shared-body'].join(' ')} onClickCapture={onContentClickCapture} data-has-footer={Boolean(footer)}>
          {children}
        </div>
        {footer && <footer className="dd-shared-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
