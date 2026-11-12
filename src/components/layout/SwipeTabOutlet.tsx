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

// 손을 뗀 뒤 남은 거리를 미끄러지는 시간 (손가락 속도에 맞춰 이 범위 안에서 정함)
const MIN_SLIDE_MS = 160
const MAX_SLIDE_MS = 300
// 처음엔 손가락 속도로 빠르게, 끝에서 부드럽게 멈추는 곡선
const SLIDE_EASE = 'cubic-bezier(.22,.75,.25,1)'

interface SwipeGesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  axis: 'undecided' | 'horizontal' | 'vertical'
  // 최근 움직임 (손을 뗄 때 속도 계산용)
  samples: { x: number; t: number }[]
}

interface PendingSlide {
  dir: 1 | -1 // 1: 다음 탭(왼쪽으로 넘김), -1: 이전 탭
  offset: number // 손을 뗀 순간 화면이 밀려 있던 거리
  duration: number
  clone: HTMLElement
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

/**
 * 지금 화면을 그대로 본뜬 정지 화면을 같은 자리에 띄웁니다.
 * 새 탭을 그리는 동안에도 손을 뗀 자리에 남아 있다가, 새 탭과 나란히 밀려 나갑니다.
 * (두 화면을 실제로 동시에 그리지 않아 API를 두 번 부르지 않습니다)
 */
function freezeCurrentScreen(surface: HTMLElement, offset: number): HTMLElement {
  const rect = surface.getBoundingClientRect()
  const frame = document.createElement('div')
  frame.className = 'dd-tab-swipe-ghost'
  frame.setAttribute('aria-hidden', 'true')
  frame.inert = true
  frame.style.left = `${rect.left}px`
  frame.style.width = `${rect.width}px`
  const copy = surface.cloneNode(true) as HTMLElement
  copy.removeAttribute('data-swipe-axis')
  copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'))
  copy.style.position = 'absolute'
  copy.style.top = `${rect.top}px`
  copy.style.left = '0'
  copy.style.width = `${rect.width}px`
  copy.style.transform = `translate3d(${offset}px,0,0)`
  frame.appendChild(copy)
  document.body.appendChild(frame)
  return frame
}

/** 옆으로 넘겨 이웃 탭으로 가는 화면. 움직임은 transform만 씁니다. */
export default function SwipeTabOutlet() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const pending = useRef<PendingSlide | null>(null)

  // 새 탭이 그려지면, 본뜬 이전 화면과 새 탭을 나란히 미끄러뜨립니다.
  useEffect(() => {
    const surface = surfaceRef.current
    const slide = pending.current
    pending.current = null
    if (!surface || !slide) return
    const width = surface.clientWidth
    const copy = slide.clone.firstElementChild as HTMLElement | null
    const options: KeyframeAnimationOptions = { duration: slide.duration, easing: SLIDE_EASE }
    const enter = surface.animate(
      [
        { transform: `translate3d(${slide.dir * width + slide.offset}px,0,0)` },
        { transform: 'translate3d(0,0,0)' },
      ],
      options,
    )
    surface.style.transform = ''
    surface.style.willChange = ''
    copy?.animate(
      [
        { transform: `translate3d(${slide.offset}px,0,0)` },
        { transform: `translate3d(${-slide.dir * width}px,0,0)` },
      ],
      { ...options, fill: 'forwards' },
    )
    const cleanup = () => slide.clone.remove()
    enter.onfinish = cleanup
    enter.oncancel = cleanup
    // 화면이 가려져 애니메이션이 멈춘 경우에도 본뜬 화면은 시간이 지나면 지웁니다.
    window.setTimeout(cleanup, slide.duration + 150)
  }, [pathname])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const currentIndex = TAB_PATHS.findIndex((path) => path === pathname)
    if (currentIndex === -1) return
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let gesture: SwipeGesture | null = null
    let offset = 0
    let frame = 0
    let suppressClick = false

    // 손가락을 따라가는 위치는 화면을 그리는 주기마다 한 번만 반영합니다.
    const paint = () => {
      frame = 0
      surface.style.transform = offset === 0 ? '' : `translate3d(${offset}px,0,0)`
    }
    const moveTo = (x: number) => {
      offset = x
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const restore = () => {
      if (frame) { cancelAnimationFrame(frame); frame = 0 }
      const from = offset
      offset = 0
      surface.style.transform = ''
      surface.style.willChange = ''
      if (from === 0 || reduceMotion()) return
      surface.animate(
        [{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(0,0,0)' }],
        { duration: 200, easing: SLIDE_EASE },
      )
    }

    const onStart = (event: TouchEvent) => {
      gesture = null
      if (pending.current || event.touches.length !== 1 || hasVisibleModal()) return
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
        axis: 'undecided', samples: [{ x: touch.clientX, t: performance.now() }],
      }
    }

    const onMove = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      gesture.lastX = touch.clientX
      gesture.lastY = touch.clientY
      const now = performance.now()
      gesture.samples.push({ x: touch.clientX, t: now })
      while (gesture.samples.length > 2 && now - gesture.samples[0].t > 100) gesture.samples.shift()
      if (gesture.axis === 'undecided') {
        if (Math.hypot(dx, dy) < 8) return
        gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'horizontal' : 'vertical'
        if (gesture.axis !== 'horizontal') return
        // 옆으로 끌기 시작했으면 손을 뗄 때 카드 · 버튼이 눌리지 않게 합니다.
        suppressClick = true
        surface.style.willChange = 'transform'
      }
      if (gesture.axis !== 'horizontal') return
      if (event.cancelable) event.preventDefault()
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1)
      // 첫 탭 · 마지막 탭에서는 고무줄처럼 조금만 밀립니다.
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length) {
        const limit = surface.clientWidth * 0.12
        moveTo(Math.sign(dx) * limit * (1 - Math.exp(-Math.abs(dx) / (limit * 2))))
      } else {
        moveTo(dx)
      }
    }

    const onEnd = () => {
      if (!gesture) return
      const finished = gesture
      gesture = null
      if (finished.axis !== 'horizontal') return
      if (frame) { cancelAnimationFrame(frame); frame = 0; paint() }
      const dx = finished.lastX - finished.startX
      const dy = finished.lastY - finished.startY
      const first = finished.samples[0]
      const last = finished.samples[finished.samples.length - 1]
      const velocity = (last.x - first.x) / Math.max(16, last.t - first.t) // px/ms, 왼쪽이 음수
      const width = surface.clientWidth
      const dir: 1 | -1 = dx < 0 ? 1 : -1
      const nextIndex = currentIndex + dir
      // 3분의 1 넘게 끌었거나, 그 방향으로 휙 넘겼으면 넘어갑니다. 반대로 되돌리면 취소합니다.
      const flung = Math.abs(velocity) > 0.35 && Math.sign(velocity) === -dir && Math.abs(dx) > 24
      const decisive = (Math.abs(dx) > width * 0.33 || flung) && Math.abs(dx) > Math.abs(dy)
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length || !decisive) {
        restore()
        return
      }

      const nextPath = TAB_PATHS[nextIndex]
      if (reduceMotion()) {
        offset = 0
        surface.style.transform = ''
        surface.style.willChange = ''
        window.scrollTo(0, 0)
        navigate(nextPath)
        return
      }
      const remaining = width - Math.abs(offset)
      const duration = Math.min(MAX_SLIDE_MS, Math.max(MIN_SLIDE_MS, remaining / Math.max(Math.abs(velocity), 1.1)))
      // 지금 화면을 손을 뗀 자리에 본떠 두고, 진짜 화면은 들어올 쪽으로 옮긴 뒤 새 탭을 그립니다.
      const clone = freezeCurrentScreen(surface, offset)
      pending.current = { dir, offset, duration, clone }
      // 새 탭이 끝내 그려지지 않는 경우에도 본뜬 화면이 남지 않게 합니다.
      window.setTimeout(() => {
        if (pending.current?.clone !== clone) return
        pending.current = null
        clone.remove()
        surface.style.transform = ''
        surface.style.willChange = ''
      }, 1500)
      surface.style.transform = `translate3d(${dir * width + offset}px,0,0)`
      offset = 0
      window.scrollTo(0, 0)
      navigate(nextPath)
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
      if (frame) cancelAnimationFrame(frame)
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
