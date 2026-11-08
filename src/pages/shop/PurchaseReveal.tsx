import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { DecorationArt, ShopCharacter } from './ShopCharacter'
import type { StudioItem } from './catalog'

export function StudioDialog({
  children,
  label,
  scene = false,
  onCancel,
}: {
  children: ReactNode
  label: string
  scene?: boolean
  onCancel?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={scene ? 'collect-film' : 'collect-dialog'}
      onCancel={(e) => {
        e.preventDefault()
        onCancel?.()
      }}
    >
      {children}
    </dialog>
  )
}
export function PurchaseReveal({
  item,
  onDone,
}: {
  item: StudioItem
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'rain' | 'rub' | 'pop' | 'done'>('rain')
  const last = useRef<{ x: number; y: number; id: number } | null>(null)
  const distance = useRef(0)
  useEffect(() => {
    if (phase === 'rub') return
    const timer = window.setTimeout(
      () => {
        if (phase === 'rain') setPhase('rub')
        if (phase === 'pop') setPhase('done')
        if (phase === 'done') onDone()
      },
      phase === 'done' ? 1000 : 2000,
    )
    return () => clearTimeout(timer)
  }, [phase, onDone])
  function rub(e: PointerEvent<HTMLButtonElement>) {
    const prev = last.current
    if (!prev || prev.id !== e.pointerId) return
    distance.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y)
    last.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    if (distance.current >= 68) setPhase('pop')
  }
  return (
    <StudioDialog label="아이템 획득" scene>
      <div className={'collect-sequence sequence-' + phase}>
        <div className="collect-ground" />
        {phase === 'rain' && <div className="collect-rain" />}
        {phase === 'rub' && (
          <button
            className="collect-rub"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              last.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
            }}
            onPointerMove={rub}
            onPointerUp={() => {
              last.current = null
            }}
            onPointerCancel={() => {
              last.current = null
            }}
            onClick={(e) => {
              if (e.detail === 0) setPhase('pop')
            }}
          >
            빗물받이를 문질러서 아이템을 얻으세요!
          </button>
        )}
        {(phase === 'pop' || phase === 'done') && (
          <div className="collect-prize">
            {item.slot === 4 ? (
              <ShopCharacter outfit={item.id} />
            ) : (
              <DecorationArt item={item} />
            )}
          </div>
        )}
        {phase === 'done' && (
          <strong role="status">
            {item.title}
            {(item.title.charCodeAt(item.title.length - 1) - 44032) % 28
              ? '을'
              : '를'}{' '}
            획득했습니다
          </strong>
        )}
      </div>
    </StudioDialog>
  )
}
