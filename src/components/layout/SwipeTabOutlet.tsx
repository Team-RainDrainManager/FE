import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router'
import './tab-swipe.css'

// Keep the order in sync with BottomNavigation. These are the only swipeable routes.
const TAB_PATHS = ['/my-drains', '/notifications', '/map', '/social', '/profile'] as const
// 버튼 · 링크 · 카드 위에서 시작해도 넘길 수 있게 하고, 직접 끌거나 입력하는 요소만 뺍니다.
const NON_SWIPE_TARGETS = [
  'input', 'textarea', 'select', 'iframe', 'canvas',
  '[contenteditable="true"]', '[draggable="true"]',
  '[role="dialog"]', '[role="slider"]', '[role="switch"]',
  '[data-no-tab-swipe]', '[data-swipe-ignore]',
  '.kakao-map', '.mapboxgl-map', '.leaflet-container', '.gm-style',
  '.rd-social-overlay', '.rd-social-league', '.dd-settings-backdrop',
  '.dd-settings-modal',
].join(', ')

// 손가락이 움직인 거리만큼 화면이 따라오다가, 넘길 때 화면 밖으로 나가는 시간
const LEAVE_MS = 150
const ENTER_MS = 190
const EASE = 'cubic-bezier(.22,1,.36,1)'

interface SwipeGesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  startAt: number
  axis: 'undecided' | 'horizontal' | 'vertical'
}

function hasVisibleModal(): boolean {
  return document.querySelector(
    '[aria-modal="true"], dialog[open], .rd-social-overlay, .rd-social-league, .dd-settings-backdrop, .dd-settings-modal',
  ) !== null
}

function shouldIgnoreElement(target: EventTarget | null, surface: HTMLElement): boolean {
  if (!(target instanceof Element)) return true
  if (target.closest(NON_SWIPE_TARGETS)) return true

  // Native horizontal carousels should scroll without triggering page changes.
  for (let node: Element | null = target; node && node !== surface; node = node.parentElement) {
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 12) {
      const overflowX = getComputedStyle(node).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
  }
  return false
}

function setOffset(node: HTMLElement, x: number) {
  node.style.transform = x === 0 ? '' : `translate3d(${x}px,0,0)`
}

/** 옆으로 넘겨 이웃 탭으로 가는 화면. 한 번에 화면 하나만 그리고, 움직임은 transform만 씁니다. */
export default function SwipeTabOutlet() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const surfaceRef = useRef<HTMLDivElement>(null)
  // 넘겨서 들어온 화면이 어느 쪽에서 들어올지 (다음 렌더 뒤 한 번 쓰고 지웁니다)
  const enterFrom = useRef<'next' | 'previous' | null>(null)

  // 넘겨서 바뀐 새 화면을 맨 위에서, 들어오는 방향으로 보여 줍니다.
  useEffect(() => {
    const surface = surfaceRef.current
    const dir = enterFrom.current
    enterFrom.current = null
    if (!surface || !dir) return
    window.scrollTo(0, 0)
    surface.style.transform = ''
    surface.style.opacity = ''
    surface.animate(
      [
        { transform: `translate3d(${dir === 'next' ? '28%' : '-28%'},0,0)`, opacity: 0.6 },
        { transform: 'translate3d(0,0,0)', opacity: 1 },
      ],
      { duration: ENTER_MS, easing: EASE },
    )
  }, [pathname])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const currentIndex = TAB_PATHS.findIndex((path) => path === pathname)
    if (currentIndex === -1) return
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let gesture: SwipeGesture | null = null
    let leaving = false
    let suppressClick = false

    const restore = () => {
      const from = surface.style.transform
      setOffset(surface, 0)
      if (!from || reduceMotion()) return
      surface.animate([{ transform: from }, { transform: 'translate3d(0,0,0)' }], { duration: 160, easing: EASE })
    }

    const onStart = (event: TouchEvent) => {
      gesture = null
      if (leaving || event.touches.length !== 1 || hasVisibleModal()) return
      if (shouldIgnoreElement(event.target, surface)) return
      const touch = event.touches[0]
      // The map canvas must retain its own pan/zoom gestures. Allow a narrow
      // edge-swipe gesture on the map screen for moving to adjacent tabs.
      if (pathname === '/map') {
        const rect = surface.getBoundingClientRect()
        const x = touch.clientX - rect.left
        if (x > 48 && x < rect.width - 48) return
      }
      gesture = {
        startX: touch.clientX, startY: touch.clientY,
        lastX: touch.clientX, lastY: touch.clientY,
        startAt: performance.now(), axis: 'undecided',
      }
    }

    const onMove = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      gesture.lastX = touch.clientX
      gesture.lastY = touch.clientY
      if (gesture.axis === 'undecided') {
        if (Math.hypot(dx, dy) < 10) return
        gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical'
        // 옆으로 끌기 시작했으면 손을 뗄 때 카드 · 버튼이 눌리지 않게 합니다.
        if (gesture.axis === 'horizontal') suppressClick = true
      }
      if (gesture.axis !== 'horizontal') return
      if (event.cancelable) event.preventDefault()
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1)
      const edge = nextIndex < 0 || nextIndex >= TAB_PATHS.length
      // 끝 탭에서는 조금만 밀리고 멈춥니다.
      const maxDistance = surface.clientWidth * (edge ? 0.08 : 0.5)
      setOffset(surface, Math.max(-maxDistance, Math.min(maxDistance, edge ? dx * 0.3 : dx)))
    }

    const onEnd = () => {
      if (!gesture) return
      const finished = gesture
      gesture = null
      if (finished.axis !== 'horizontal') return
      const dx = finished.lastX - finished.startX
      const dy = finished.lastY - finished.startY
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1)
      const elapsed = Math.max(1, performance.now() - finished.startAt)
      const decisive = Math.abs(dx) >= Math.min(70, surface.clientWidth * 0.18)
        || (Math.abs(dx) >= 36 && Math.abs(dx) / elapsed >= 0.35)
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length || !decisive || Math.abs(dx) < Math.abs(dy)) {
        restore()
        return
      }

      const nextPath = TAB_PATHS[nextIndex]
      const dir = dx < 0 ? 'next' : 'previous'
      if (reduceMotion()) {
        setOffset(surface, 0)
        navigate(nextPath)
        return
      }
      // 지금 위치에서 화면 밖으로 밀어낸 뒤 새 탭을 그립니다. (두 화면을 동시에 그리지 않음)
      leaving = true
      const from = surface.style.transform || 'translate3d(0,0,0)'
      const to = `translate3d(${dir === 'next' ? '-100%' : '100%'},0,0)`
      surface.style.transform = to
      const leave = surface.animate([{ transform: from }, { transform: to }], { duration: LEAVE_MS, easing: 'ease-in' })
      leave.onfinish = () => {
        surface.style.opacity = '0'
        enterFrom.current = dir
        navigate(nextPath)
      }
    }

    const onCancel = () => {
      if (gesture?.axis === 'horizontal') restore()
      gesture = null
    }
    // 끌기로 끝난 터치 뒤에 오는 클릭 한 번을 막습니다.
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
    }
    const onTouchStartReset = () => { suppressClick = false }

    surface.addEventListener('touchstart', onTouchStartReset, { capture: true, passive: true })
    surface.addEventListener('touchstart', onStart, { passive: true })
    surface.addEventListener('touchmove', onMove, { passive: false })
    surface.addEventListener('touchend', onEnd, { passive: true })
    surface.addEventListener('touchcancel', onCancel, { passive: true })
    surface.addEventListener('click', onClick, { capture: true })
    return () => {
      surface.removeEventListener('touchstart', onTouchStartReset, { capture: true })
      surface.removeEventListener('touchstart', onStart)
      surface.removeEventListener('touchmove', onMove)
      surface.removeEventListener('touchend', onEnd)
      surface.removeEventListener('touchcancel', onCancel)
      surface.removeEventListener('click', onClick, { capture: true })
    }
  }, [pathname, navigate])

  const swipeable = TAB_PATHS.some((path) => path === pathname)
  return (
    <div
      ref={surfaceRef}
      className="dd-tab-swipe-surface"
      data-swipe-axis={swipeable && pathname !== '/map' ? 'y' : undefined}
    >
      {outlet}
    </div>
  )
}
