import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate, useOutlet } from 'react-router'
import './tab-swipe.css'

// Keep the order in sync with BottomNavigation. These are the only swipeable routes.
const TAB_PATHS = ['/my-drains', '/map', '/social', '/notifications', '/profile'] as const
const NON_SWIPE_TARGETS = [
  'a', 'button', 'input', 'textarea', 'select', 'label', 'iframe', 'canvas',
  '[contenteditable="true"]', '[draggable="true"]',
  '[role="dialog"]', '[role="slider"]', '[role="tablist"]',
  '[role="button"]', '[role="switch"]', '[role="checkbox"]',
  '[data-no-tab-swipe]', '[data-swipe-ignore]',
  '.kakao-map', '.mapboxgl-map', '.leaflet-container', '.gm-style',
  '.rd-social-overlay', '.rd-social-league', '.dd-settings-backdrop',
  '.dd-settings-modal',
].join(', ')

interface SwipeGesture {
  startX: number
  startY: number
  lastX: number
  lastY: number
  startAt: number
  axis: 'undecided' | 'horizontal' | 'vertical'
  originPath: string
}

function hasVisibleModal(): boolean {
  const selectors = [
    '[role="dialog"][aria-modal="true"]',
    '.rd-social-overlay', '.rd-social-league',
    '.dd-settings-backdrop', '.dd-settings-modal',
  ]
  return selectors.some((selector) =>
    [...document.querySelectorAll<HTMLElement>(selector)].some(
      (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden',
    ),
  )
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

function clearDrag(node: HTMLElement) {
  node.style.transform = ''
  node.style.transition = ''
  node.style.willChange = ''
}

export default function SwipeTabOutlet() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const surfaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const currentIndex = TAB_PATHS.findIndex((path) => path === pathname)
    if (currentIndex === -1) return

    let gesture: SwipeGesture | null = null
    let restoreTimer: number | undefined

    const restore = (animated = true) => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer)
      if (!animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        clearDrag(surface)
        return
      }
      surface.style.transition = 'transform 155ms cubic-bezier(.2,.8,.25,1)'
      surface.style.transform = 'translate3d(0,0,0)'
      restoreTimer = window.setTimeout(() => clearDrag(surface), 165)
    }

    const onStart = (event: TouchEvent) => {
      gesture = null
      if (event.touches.length !== 1 || hasVisibleModal()) return
      if (shouldIgnoreElement(event.target, surface)) return
      const touch = event.touches[0]
      // The map canvas must retain its own pan/zoom gestures. Allow a narrow
      // edge-swipe gesture on the map screen for moving to adjacent tabs.
      if (pathname === '/map') {
        const rect = surface.getBoundingClientRect()
        const x = touch.clientX - rect.left
        if (x > 48 && x < rect.width - 48) return
      }
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer)
      clearDrag(surface)
      gesture = {
        startX: touch.clientX, startY: touch.clientY,
        lastX: touch.clientX, lastY: touch.clientY,
        startAt: performance.now(), axis: 'undecided', originPath: pathname,
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
        gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'horizontal' : 'vertical'
      }
      if (gesture.axis !== 'horizontal') return
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1)
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length) return
      if (event.cancelable) event.preventDefault()
      const maxDistance = surface.clientWidth * 0.38
      const limited = Math.max(-maxDistance, Math.min(maxDistance, dx))
      surface.style.transition = 'none'
      surface.style.willChange = 'transform'
      surface.style.transform = `translate3d(${limited}px,0,0)`
    }

    const onEnd = () => {
      if (!gesture) return
      const finished = gesture
      gesture = null
      if (finished.axis !== 'horizontal' || finished.originPath !== pathname || hasVisibleModal()) {
        restore()
        return
      }
      const dx = finished.lastX - finished.startX
      const dy = finished.lastY - finished.startY
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1)
      const elapsed = Math.max(1, performance.now() - finished.startAt)
      const decisive = Math.abs(dx) >= Math.min(76, surface.clientWidth * 0.20)
        || (Math.abs(dx) >= 42 && Math.abs(dx) / elapsed >= 0.38)
      if (nextIndex < 0 || nextIndex >= TAB_PATHS.length || !decisive || Math.abs(dx) < Math.abs(dy) * 1.2) {
        restore()
        return
      }

      const nextPath = TAB_PATHS[nextIndex]
      const dir = dx < 0 ? 'next' : 'previous'
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      clearDrag(surface)
      if (reduceMotion) {
        navigate(nextPath)
        return
      }

      const root = document.documentElement
      root.dataset.ddTabSwipe = dir
      if (typeof document.startViewTransition === 'function') {
        // Capture the previous and next routed screens as native snapshots.
        // This avoids mounting two live pages (and triggering their APIs twice).
        try {
          const transition = document.startViewTransition(() => {
            flushSync(() => navigate(nextPath))
          })
          void transition.finished.finally(() => { delete root.dataset.ddTabSwipe }).catch(() => {})
        } catch {
          delete root.dataset.ddTabSwipe
          navigate(nextPath)
        }
      } else {
        flushSync(() => navigate(nextPath))
        delete root.dataset.ddTabSwipe
        // Older browsers: animate the new screen, without duplicating components.
        surface.animate(
          [
            { transform: `translate3d(${dir === 'next' ? '40px' : '-40px'},0,0)`, opacity: 0.84 },
            { transform: 'translate3d(0,0,0)', opacity: 1 },
          ],
          { duration: 210, easing: 'cubic-bezier(.22,1,.36,1)' },
        )
      }
    }

    const onCancel = () => { gesture = null; restore() }
    surface.addEventListener('touchstart', onStart, { passive: true })
    surface.addEventListener('touchmove', onMove, { passive: false })
    surface.addEventListener('touchend', onEnd, { passive: true })
    surface.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      surface.removeEventListener('touchstart', onStart)
      surface.removeEventListener('touchmove', onMove)
      surface.removeEventListener('touchend', onEnd)
      surface.removeEventListener('touchcancel', onCancel)
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer)
      clearDrag(surface)
    }
  }, [pathname, navigate])

  return <div ref={surfaceRef} className="dd-tab-swipe-surface">{outlet}</div>
}
