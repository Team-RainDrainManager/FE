import { startTransition, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router'

import MyDrainsPage from '../../pages/mydrains/MyDrainsPage'
import NotificationsPage from '../../pages/notifications/NotificationsPage'
import SocialPage from '../../pages/social/SocialPage'
import ProfilePage from '../../pages/profile/ProfilePage'
import './tab-swipe.css'

// 옆으로 넘길 수 있는 탭 (아래 탭바 순서, 지도는 지도를 끌어야 해서 뺌)
const SWIPE_TABS = ['/my-drains', '/notifications', '/social', '/profile'] as const
type SwipeTab = (typeof SWIPE_TABS)[number]

// 각 탭에서 넘길 수 있는 쪽. next: 손가락을 왼쪽으로 밀어 오른쪽 탭으로, prev: 오른쪽으로 밀어 왼쪽 탭으로
// 또랑이 · 프로필에서는 넘기지 않습니다. (알림 · 소셜에서 넘겨 들어오는 것은 됨)
const SWIPE_FROM: Record<SwipeTab, { prev: boolean; next: boolean }> = {
  '/my-drains': { prev: false, next: false },
  '/notifications': { prev: true, next: true },
  '/social': { prev: true, next: true },
  '/profile': { prev: false, next: false },
}

// 탭 화면은 한 번 만든 요소를 계속 써서, 탭을 오가도 다시 그리지 않게 합니다.
const PAGES: Record<SwipeTab, ReactElement> = {
  '/my-drains': <MyDrainsPage />,
  '/notifications': <NotificationsPage />,
  '/social': <SocialPage />,
  '/profile': <ProfilePage />,
}

// 버튼 · 링크 · 카드 위에서 시작해도 넘길 수 있게 하고, 직접 끌거나 입력하는 요소만 뺍니다.
const NON_SWIPE_TARGETS = [
  'input', 'textarea', 'select', 'iframe', 'canvas',
  '[contenteditable="true"]', '[draggable="true"]',
  '[role="dialog"]', '[role="slider"]', '[role="switch"]',
  '[data-no-tab-swipe]', '[data-swipe-ignore]',
  '.rd-social-overlay', '.rd-social-league', '.dd-settings-backdrop',
  '.dd-settings-modal',
].join(', ')

// 손을 뗀 뒤 남은 거리를 미끄러지는 시간 (손가락 속도에 맞춰 이 범위 안에서 정함)
const MIN_SLIDE_MS = 160
const MAX_SLIDE_MS = 300
// 처음엔 손가락 속도로 빠르게, 끝에서 부드럽게 멈추는 곡선
const SLIDE_EASE = 'cubic-bezier(.22,.75,.25,1)'
// 탭에 들어온 뒤 이웃 탭을 미리 그리기 시작하는 시점 (지금 탭을 먼저 그리고 나서)
const PREPARE_DELAY_MS = 250

function swipeTarget(tab: SwipeTab, dir: 1 | -1): SwipeTab | null {
  if (!SWIPE_FROM[tab][dir === 1 ? 'next' : 'prev']) return null
  return SWIPE_TABS[SWIPE_TABS.indexOf(tab) + dir] ?? null
}

function neighborsOf(tab: SwipeTab): SwipeTab[] {
  return [swipeTarget(tab, -1), swipeTarget(tab, 1)].filter((t): t is SwipeTab => t !== null)
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

interface SwipeGesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  axis: 'undecided' | 'horizontal' | 'vertical'
  dir: 1 | -1
  target: SwipeTab | null
  // 최근 움직임 (손을 뗄 때 속도 계산용)
  samples: { x: number; t: number }[]
}

/**
 * 탭 화면. 넘길 수 있는 4개 탭은 TabPager가, 나머지 화면(지도 · 상세 등)은 라우터가 그대로 그립니다.
 */
export default function SwipeTabOutlet() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const tab = SWIPE_TABS.find((path) => path === pathname)
  if (!tab) return <div className="dd-tab-plain">{outlet}</div>
  return <TabPager active={tab} />
}

/**
 * 옆으로 넘기는 탭 묶음.
 * 지금 탭에서 넘어갈 수 있는 이웃 탭을 미리 그려 옆에 숨겨 두었다가, 끌기 시작하면 바로 보여 줍니다.
 * 넘어가면 미리 그려 둔 화면이 그대로 지금 탭이 되어 다시 그리지 않습니다.
 */
function TabPager({ active }: { active: SwipeTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const trackRef = useRef<HTMLDivElement>(null)
  // 넘기기 뒤 새 탭이 화면에 반영되면 할 정리 (라우터가 전환을 나중에 그려도 이전 화면이 비치지 않게)
  const settleRef = useRef<{ target: SwipeTab; done: () => void } | null>(null)
  const [mounted, setMounted] = useState<SwipeTab[]>([active])
  const [keys, setKeys] = useState<Partial<Record<SwipeTab, string>>>({})
  const [shown, setShown] = useState(active)

  // 탭이 바뀐 순간 (렌더 중에 반영해 한 번에 그림)
  // 넘기기로 이동했는지는 이동할 때 넘긴 표시로 압니다.
  const arrivedBySwipe = (location.state as { ddTabSwipe?: boolean } | null)?.ddTabSwipe === true
  if (shown !== active) {
    setShown(active)
    // 링크 · 알림으로 값(state · 주소 뒤 ?)을 넘겨 들어오면 그 값을 읽도록 화면을 새로 만듭니다.
    if (!arrivedBySwipe && (location.search || location.state)) {
      setKeys((prev) => ({ ...prev, [active]: location.key }))
    }
  }

  // 새 탭이 그려진 직후(화면에 보이기 전) 끌던 위치 · 스크롤을 정리합니다.
  useLayoutEffect(() => {
    const pending = settleRef.current
    if (!pending || pending.target !== active) return
    settleRef.current = null
    pending.done()
  }, [active])

  // 지금 탭을 그린 뒤, 넘어갈 수 있는 이웃 탭만 미리 그려 두고 나머지는 정리합니다.
  // (startTransition: 미리 그리는 동안에도 스크롤 · 터치가 막히지 않게 나눠서 그림)
  useEffect(() => {
    const want = [active, ...neighborsOf(active)]
    const timer = window.setTimeout(() => {
      startTransition(() => {
        setMounted((prev) => (prev.length === want.length && want.every((t) => prev.includes(t)) ? prev : want))
      })
    }, PREPARE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (!SWIPE_FROM[active].prev && !SWIPE_FROM[active].next) return
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let gesture: SwipeGesture | null = null
    let peekEl: HTMLElement | null = null
    let offset = 0
    let frame = 0
    let busy = false
    let suppressClick = false

    const findPage = (tab: SwipeTab) => track.querySelector<HTMLElement>(`:scope > [data-tab="${tab}"]`)
    // 이웃 탭을 지금 보이는 높이(머리글 바로 아래)에 맞춰 보이게 합니다.
    const showPeek = (tab: SwipeTab) => {
      if (peekEl) return
      peekEl = findPage(tab)
      if (!peekEl) return
      peekEl.style.top = `${window.scrollY}px`
      peekEl.style.visibility = 'visible'
    }
    const hidePeek = () => {
      if (!peekEl) return
      peekEl.style.top = ''
      peekEl.style.visibility = ''
      peekEl = null
    }

    // 손가락을 따라가는 위치는 화면을 그리는 주기마다 한 번만 반영합니다.
    const paint = () => {
      frame = 0
      track.style.transform = offset === 0 ? '' : `translate3d(${offset}px,0,0)`
      // 끄는 사이에 이웃 탭이 다 그려졌으면 이제 보여 줍니다.
      if (!peekEl && gesture?.target) showPeek(gesture.target)
    }
    const moveTo = (x: number) => {
      offset = x
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const flush = () => {
      if (frame) { cancelAnimationFrame(frame); paint() }
    }
    const resetTrack = () => {
      offset = 0
      track.style.transform = ''
      track.style.willChange = ''
    }

    const restore = () => {
      flush()
      const from = offset
      resetTrack()
      if (from === 0 || reduceMotion()) { hidePeek(); return }
      busy = true
      const back = track.animate(
        [{ transform: `translate3d(${from}px,0,0)` }, { transform: 'translate3d(0,0,0)' }],
        { duration: 200, easing: SLIDE_EASE },
      )
      const done = once(() => { busy = false; hidePeek() })
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
      gesture = {
        startX: touch.clientX, startY: touch.clientY,
        lastX: touch.clientX, lastY: touch.clientY,
        axis: 'undecided', dir: 1, target: null,
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
        const target = swipeTarget(active, dir)
        // 그쪽으로는 넘기지 않는 탭이면 화면을 움직이지 않습니다.
        if (!target) { gesture = null; return }
        gesture.axis = 'horizontal'
        gesture.dir = dir
        gesture.target = target
        // 옆으로 끌기 시작했으면 손을 뗄 때 카드 · 버튼이 눌리지 않게 합니다.
        suppressClick = true
        track.style.willChange = 'transform'
        showPeek(target)
        // 아직 미리 그려 두지 못했으면 지금 그리기 시작합니다. (다 그려지면 그때 보임)
        if (!peekEl) startTransition(() => setMounted((prev) => (prev.includes(target) ? prev : [...prev, target])))
      }
      if (gesture.axis !== 'horizontal') return
      if (event.cancelable) event.preventDefault()
      // 정한 방향 반대로는 넘어가지 않게 (반대쪽엔 이웃 탭이 없음)
      moveTo(gesture.dir === 1 ? Math.min(0, dx) : Math.max(0, dx))
    }

    const onEnd = () => {
      if (!gesture) return
      const finished = gesture
      gesture = null
      if (finished.axis !== 'horizontal' || !finished.target) return
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

      const nextPath = finished.target
      // 옆에 보이던 이웃 탭이 그대로 지금 탭이 됩니다. (같은 화면이라 다시 그리지 않음)
      // 라우터가 새 탭을 그릴 때까지는 끝 위치에 그대로 두었다가, 그려진 순간 한 번에 정리합니다.
      const settle = once(() => {
        hidePeek()
        resetTrack()
        window.scrollTo(0, 0)
        busy = false
      })
      const finish = once(() => {
        settleRef.current = { target: nextPath, done: settle }
        navigate(nextPath, { state: { ddTabSwipe: true } })
        window.setTimeout(() => {
          if (settleRef.current?.done !== settle) return
          settleRef.current = null
          settle()
        }, 1500)
      })
      if (reduceMotion() || !peekEl) { busy = true; finish(); return }
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
  }, [active, navigate])

  const swipeable = SWIPE_FROM[active].prev || SWIPE_FROM[active].next
  const activeIndex = SWIPE_TABS.indexOf(active)
  return (
    <div ref={trackRef} className="dd-tab-pager" data-swipe-axis={swipeable ? 'y' : undefined}>
      {SWIPE_TABS.filter((tab) => tab === active || mounted.includes(tab)).map((tab) => {
        const isActive = tab === active
        return (
          <section
            key={`${tab}:${keys[tab] ?? ''}`}
            className="dd-tab-page"
            data-tab={tab}
            data-state={isActive ? 'active' : 'parked'}
            data-side={isActive ? undefined : SWIPE_TABS.indexOf(tab) > activeIndex ? 'next' : 'prev'}
            aria-hidden={isActive ? undefined : true}
            inert={!isActive}
          >
            {PAGES[tab]}
          </section>
        )
      })}
    </div>
  )
}
