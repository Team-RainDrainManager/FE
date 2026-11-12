import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate, useOutlet } from 'react-router'

import MyDrainsPage from '../../pages/mydrains/MyDrainsPage'
import NotificationsPage from '../../pages/notifications/NotificationsPage'
import SocialPage from '../../pages/social/SocialPage'
import ProfilePage from '../../pages/profile/ProfilePage'
import './tab-swipe.css'

// Keep the order in sync with BottomNavigation. These are the only swipeable routes.
const TAB_PATHS = ['/my-drains', '/notifications', '/map', '/social', '/profile'] as const
type TabPath = (typeof TAB_PATHS)[number]

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

/**
 * 끄는 동안 옆에 미리 보여 줄 탭 화면.
 * 지도는 지도 SDK를 새로 띄우면 무거워서 지도 바탕만 그립니다. (손을 떼면 진짜 지도가 열림)
 */
function renderTab(path: TabPath): ReactNode {
  switch (path) {
    case '/my-drains': return <MyDrainsPage />
    case '/notifications': return <NotificationsPage />
    case '/social': return <SocialPage />
    case '/profile': return <ProfilePage />
    case '/map': return <div className="dd-tab-peek-map" />
  }
}

interface SwipeGesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  axis: 'undecided' | 'horizontal' | 'vertical'
  dir: 1 | -1 // 1: 다음 탭(손가락을 왼쪽으로), -1: 이전 탭
  // 최근 움직임 (손을 뗄 때 속도 계산용)
  samples: { x: number; t: number }[]
}

interface Peek {
  path: TabPath
  dir: 1 | -1
  top: number
}

/** 여러 번 불려도 한 번만 실행합니다. (애니메이션 끝 신호와 예비 타이머가 겹칠 때) */
function once(run: () => void): () => void {
  let done = false
  return () => {
    if (done) return
    done = true
    run()
  }
}

function hasVisibleModal(): boolean {
  return document.querySelector(
    '[aria-modal="true"], dialog[open], .rd-social-overlay, .rd-social-league, .dd-settings-backdrop, .dd-settings-modal',
  ) !== null
}

function shouldIgnoreElement(target: EventTarget | null, track: HTMLElement): boolean {
  if (!(target instanceof Element)) return true
  if (target.closest(NON_SWIPE_TARGETS)) return true

  // Native horizontal carousels should scroll without triggering page changes.
  for (let node: Element | null = target; node && node !== track; node = node.parentElement) {
    if (node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 12) {
      const overflowX = getComputedStyle(node).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
  }
  return false
}

/**
 * 옆으로 넘겨 이웃 탭으로 가는 화면.
 * 끌기 시작하면 이웃 탭을 바로 옆에 붙여 그려서, 두 화면이 나란히 따라 움직입니다.
 * 첫 탭(또랑이)은 오른쪽으로, 마지막 탭(프로필)은 왼쪽으로 끌어도 움직이지 않습니다.
 */
export default function SwipeTabOutlet() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const trackRef = useRef<HTMLDivElement>(null)
  const [peek, setPeek] = useState<Peek | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const currentIndex = TAB_PATHS.findIndex((path) => path === pathname)
    if (currentIndex === -1) return
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let gesture: SwipeGesture | null = null
    let offset = 0
    let frame = 0
    let busy = false
    let suppressClick = false

    // 손가락을 따라가는 위치는 화면을 그리는 주기마다 한 번만 반영합니다.
    const paint = () => {
      frame = 0
      track.style.transform = offset === 0 ? '' : `translate3d(${offset}px,0,0)`
    }
    const moveTo = (x: number) => {
      offset = x
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const flush = () => {
      if (frame) { cancelAnimationFrame(frame); paint() }
    }
    const reset = () => {
      offset = 0
      track.style.transform = ''
      track.style.willChange = ''
    }

    const restore = () => {
      flush()
      const from = offset
      reset()
      if (from === 0 || reduceMotion()) { setPeek(null); return }
      busy = true
      const back = track.animate(
        [{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(0,0,0)' }],
        { duration: 200, easing: SLIDE_EASE },
      )
      const done = once(() => { busy = false; setPeek(null) })
      back.onfinish = done
      back.oncancel = done
      // 앱이 가려져 애니메이션 신호가 오지 않아도 멈춰 있지 않게 합니다.
      window.setTimeout(done, 200 + 120)
    }

    const onStart = (event: TouchEvent) => {
      gesture = null
      if (busy || event.touches.length !== 1 || hasVisibleModal()) return
      if (shouldIgnoreElement(event.target, track)) return
      const touch = event.touches[0]
      // The map canvas must retain its own pan/zoom gestures. Allow a narrow
      // edge-swipe gesture on the map screen for moving to adjacent tabs.
      if (pathname === '/map') {
        const rect = track.getBoundingClientRect()
        const x = touch.clientX - rect.left
        if (x > 48 && x < rect.width - 48) return
      }
      gesture = {
        startX: touch.clientX, startY: touch.clientY,
        lastX: touch.clientX, lastY: touch.clientY,
        axis: 'undecided', dir: 1,
        samples: [{ x: touch.clientX, t: performance.now() }],
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
        if (Math.abs(dx) <= Math.abs(dy) * 1.2) { gesture.axis = 'vertical'; return }
        const dir: 1 | -1 = dx < 0 ? 1 : -1
        const nextIndex = currentIndex + dir
        // 그쪽에 탭이 없으면 (또랑이에서 오른쪽, 프로필에서 왼쪽) 화면을 움직이지 않습니다.
        if (nextIndex < 0 || nextIndex >= TAB_PATHS.length) { gesture = null; return }
        gesture.axis = 'horizontal'
        gesture.dir = dir
        // 옆으로 끌기 시작했으면 손을 뗄 때 카드 · 버튼이 눌리지 않게 합니다.
        suppressClick = true
        track.style.willChange = 'transform'
        // 이웃 탭을 지금 보이는 높이에 맞춰 옆에 붙입니다.
        setPeek({ path: TAB_PATHS[nextIndex], dir, top: window.scrollY })
      }
      if (gesture.axis !== 'horizontal') return
      if (event.cancelable) event.preventDefault()
      // 정한 방향 반대로는 넘어가지 않게 (반대쪽엔 이웃 탭이 붙어 있지 않음)
      moveTo(gesture.dir === 1 ? Math.min(0, dx) : Math.max(0, dx))
    }

    const onEnd = () => {
      if (!gesture) return
      const finished = gesture
      gesture = null
      if (finished.axis !== 'horizontal') return
      flush()
      const dx = finished.lastX - finished.startX
      const dy = finished.lastY - finished.startY
      const first = finished.samples[0]
      const last = finished.samples[finished.samples.length - 1]
      const velocity = (last.x - first.x) / Math.max(16, last.t - first.t) // px/ms, 왼쪽이 음수
      const width = track.clientWidth
      const dir = finished.dir
      // 3분의 1 넘게 끌었거나, 그 방향으로 휙 넘겼으면 넘어갑니다. 반대로 되돌리면 취소합니다.
      const flung = Math.abs(velocity) > 0.35 && Math.sign(velocity) === -dir && Math.abs(offset) > 40
      const decisive = (Math.abs(offset) > width * 0.33 || flung) && Math.abs(dx) > Math.abs(dy)
      if (!decisive) {
        restore()
        return
      }

      const nextPath = TAB_PATHS[currentIndex + dir]
      const finish = once(() => {
        // 미리 보이던 이웃 탭 자리에 진짜 탭을 그대로 그립니다.
        flushSync(() => {
          navigate(nextPath)
          setPeek(null)
        })
        reset()
        window.scrollTo(0, 0)
        busy = false
      })
      if (reduceMotion()) { finish(); return }
      busy = true
      const from = offset
      const remaining = width - Math.abs(from)
      const duration = Math.min(MAX_SLIDE_MS, Math.max(MIN_SLIDE_MS, remaining / Math.max(Math.abs(velocity), 1.1)))
      const to = -dir * width
      track.style.transform = `translate3d(${to}px,0,0)`
      const slide = track.animate(
        [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
        { duration, easing: SLIDE_EASE },
      )
      slide.onfinish = finish
      slide.oncancel = finish
      window.setTimeout(finish, duration + 120)
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

    track.addEventListener('touchstart', onTouchStartReset, { capture: true, passive: true })
    track.addEventListener('touchstart', onStart, { passive: true })
    track.addEventListener('touchmove', onMove, { passive: false })
    track.addEventListener('touchend', onEnd, { passive: true })
    track.addEventListener('touchcancel', onCancel, { passive: true })
    track.addEventListener('click', onClick, { capture: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      track.removeEventListener('touchstart', onTouchStartReset, { capture: true })
      track.removeEventListener('touchstart', onStart)
      track.removeEventListener('touchmove', onMove)
      track.removeEventListener('touchend', onEnd)
      track.removeEventListener('touchcancel', onCancel)
      track.removeEventListener('click', onClick, { capture: true })
    }
  }, [pathname, navigate])

  const swipeable = TAB_PATHS.some((path) => path === pathname)
  return (
    <div
      ref={trackRef}
      className="dd-tab-swipe-track"
      data-swipe-axis={swipeable && pathname !== '/map' ? 'y' : undefined}
    >
      <div className="dd-tab-swipe-surface">{outlet}</div>
      {peek && (
        <div
          className="dd-tab-swipe-peek"
          data-side={peek.dir === 1 ? 'next' : 'previous'}
          style={{ top: peek.top }}
          aria-hidden="true"
          inert
        >
          {renderTab(peek.path)}
        </div>
      )}
    </div>
  )
}
