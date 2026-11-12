import { useEffect } from 'react'

// 화면을 덮는 창: aria-modal 대화상자와 showModal()로 연 <dialog>
const MODAL_SELECTOR = '[aria-modal="true"], dialog[open]'

/**
 * 화면을 덮는 창이 떠 있는 동안 뒤 화면이 같이 스크롤되지 않게 막습니다. (이중 스크롤 방지)
 *
 * 아이폰 사파리는 body의 overflow만 막아서는 뒤 화면이 계속 움직이므로,
 * body를 현재 스크롤 위치에 고정했다가 창이 모두 닫히면 원래 위치로 되돌립니다.
 * 각 창이 따로 거는 body overflow 처리와 겹치지 않게 position · top과 html overflow만 씁니다.
 */
export default function ModalScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    let locked = false
    let scrollY = 0
    let saved: Record<'position' | 'top' | 'left' | 'right' | 'width', string> | null = null
    let savedHtmlOverflow = ''

    function lock() {
      scrollY = window.scrollY
      saved = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width }
      savedHtmlOverflow = html.style.overflow
      html.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      locked = true
    }

    function unlock() {
      if (saved) Object.assign(body.style, saved)
      html.style.overflow = savedHtmlOverflow
      window.scrollTo(0, scrollY)
      locked = false
    }

    function sync() {
      const open = document.querySelector(MODAL_SELECTOR) !== null
      if (open && !locked) lock()
      else if (!open && locked) unlock()
    }

    const observer = new MutationObserver(sync)
    observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'open'] })
    sync()
    return () => {
      observer.disconnect()
      if (locked) unlock()
    }
  }, [])

  return null
}
