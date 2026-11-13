import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../features/account/sanctions-warning.css'

export default function Sheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode
}) {
  const titleId = useId()
  const sheet = useRef<HTMLElement>(null)
  const start = useRef<number | null>(null)
  const [closing, setClosing] = useState(false)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  function dismiss() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) close.current()
    else setClosing(true)
  }
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => close.current(), 220)
    return () => clearTimeout(timer)
  }, [closing])
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheet.current?.focus()
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
      if (event.key !== 'Tab') return
      const buttons = sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href], [tabindex="0"]')
      if (!buttons?.length) return
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', key)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  return createPortal(<div className="dd21-sanctions-overlay dd-shared-overlay" data-closing={closing} onMouseDown={e => {
    if (e.target === e.currentTarget) dismiss()
  }}>
    <section ref={sheet} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="dd21-sanctions-sheet dd-shared-sheet">
      <div className="dd21-sanctions-grab" aria-hidden="true"
        onPointerDown={e => { if (e.button === 0) { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) } }}
        onPointerMove={e => { if (start.current !== null) sheet.current?.style.setProperty('transform', 'translateY(' + Math.max(0, e.clientY - start.current) + 'px)') }}
        onPointerUp={e => {
          if (start.current !== null && e.clientY - start.current > 80) dismiss()
          start.current = null
          sheet.current?.style.removeProperty('transform')
        }}
        onPointerCancel={() => { start.current = null; sheet.current?.style.removeProperty('transform') }}><span /></div>
      <header className="dd21-sanctions-heading"><h2 id={titleId}>{title}</h2></header>
      <div className="dd21-sanctions-body dd-shared-body">{children}</div>
    </section>
  </div>, document.body)
}
