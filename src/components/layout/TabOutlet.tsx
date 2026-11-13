import { useLayoutEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router'

// 아래 탭바 순서. 이 화면들 사이를 오갈 때만 전환 효과를 줍니다.
const TAB_PATHS = ['/my-drains', '/social', '/map', '/notifications', '/profile']

// 새 탭이 누른 쪽에서 살짝 밀려 들어오며 나타나는 거리와 시간
const ENTER_DISTANCE_PX = 24
const ENTER_MS = 220
const ENTER_EASE = 'cubic-bezier(.22,.75,.25,1)'

/**
 * 탭 화면. 아래 탭바로 탭을 바꾸면 새 탭이 누른 쪽에서 부드럽게 나타납니다.
 * 새 탭이 그려진 직후(화면에 보이기 전)에 시작하고, 투명도와 transform만 움직여 가볍습니다.
 */
export default function TabOutlet() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const previousPath = useRef(pathname)

  useLayoutEffect(() => {
    const from = TAB_PATHS.indexOf(previousPath.current)
    const to = TAB_PATHS.indexOf(pathname)
    previousPath.current = pathname
    const surface = surfaceRef.current
    if (!surface || from === -1 || to === -1 || from === to) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dx = to > from ? ENTER_DISTANCE_PX : -ENTER_DISTANCE_PX
    surface.animate(
      [
        { opacity: 0, transform: `translate3d(${dx}px,0,0)` },
        { opacity: 1, transform: 'translate3d(0,0,0)' },
      ],
      { duration: ENTER_MS, easing: ENTER_EASE },
    )
  }, [pathname])

  return <div ref={surfaceRef}>{outlet}</div>
}
