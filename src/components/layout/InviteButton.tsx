import { useEffect, useRef, useState } from 'react'

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
}

async function copyInviteLink(url: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return
    } catch {
      // 클립보드 권한이 제한된 환경에서는 선택 복사를 시도합니다.
    }
  }

  const previousFocus = document.activeElement
  const field = document.createElement('textarea')
  field.value = url
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.style.pointerEvents = 'none'
  document.body.appendChild(field)

  try {
    field.select()
    if (!document.execCommand('copy')) throw new Error('링크 복사 실패')
  } finally {
    field.remove()
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
  }
}

export default function InviteButton() {
  const inviting = useRef(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2300)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function shareInvite() {
    if (inviting.current) return
    inviting.current = true

    try {
      const url = new URL('/social', window.location.origin).href
      if (isMobileDevice() && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: '또랑 친구 초대',
            text: '또랑에서 함께 물길을 돌봐요!',
            url,
          })
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }

      await copyInviteLink(url)
      setNotice('초대 링크가 복사됐어요.')
    } catch {
      setNotice('링크 복사에 실패했어요. 주소창의 링크를 복사해 주세요.')
    } finally {
      inviting.current = false
    }
  }

  return (
    <>
      <button type="button" aria-label="친구 초대하기" onClick={() => void shareInvite()}
        className="flex h-10 w-10 shrink-0 items-center justify-center bg-transparent [-webkit-tap-highlight-color:transparent] text-[#203451] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3981F7]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="6.5" r="3.5" />
          <path d="M2 21v-1.5a7 7 0 0 1 14 0V21M19 7v7m-3.5-3.5h7" />
        </svg>
      </button>
      {notice && (
        <p role="status" className="fixed inset-x-5 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-[420px] rounded-xl bg-[#193454] px-4 py-3 text-center text-[13px] text-white shadow-lg">
          {notice}
        </p>
      )}
    </>
  )
}
