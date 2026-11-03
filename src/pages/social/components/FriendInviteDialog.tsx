import { useEffect } from 'react'
import './friend-invite-dialog.css'

type Props = {
  onClose: () => void
  onNotice: (message: string) => void
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
}

async function copyInviteLink(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Safari/HTTP 등 클립보드 권한 제한 시 아래 방식으로 재시도
    }
  }

  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.style.pointerEvents = 'none'
  document.body.appendChild(field)
  field.select()
  try {
    if (!document.execCommand('copy')) throw new Error('클립보드 복사 실패')
  } finally {
    document.body.removeChild(field)
  }
}

export default function FriendInviteDialog({ onClose, onNotice }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleShare() {
    // 친구 자동 등록·카카오톡 친구 목록 조회가 아닌 현재 앱 소셜 화면 URL 공유
    const inviteUrl = new URL('/social', window.location.origin).toString()

    if (isMobileDevice() && typeof navigator.share === 'function') {
      // 공유 메뉴는 클릭 이벤트의 사용자 제스처가 살아 있을 때 즉시 요청합니다.
      // 팝업은 결과와 무관하게 닫혀 앱을 계속 사용할 수 있습니다.
      try {
        const shareTask = navigator.share({
          title: '또랑 친구 초대',
          text: '또랑에서 함께 물길을 돌봐요!',
          url: inviteUrl,
        })
        onClose()
        await shareTask
      } catch (error: unknown) {
        onClose()
        if (error instanceof DOMException && error.name === 'AbortError') return
        // 웹 공유 지원 기기라도 실패할 경우 일반 링크 복사를 시도합니다.
        try {
          await copyInviteLink(inviteUrl)
          onNotice('초대 링크가 복사 됐어요!')
        } catch {
          onNotice('공유하지 못했어요. 주소창의 링크를 복사해 주세요.')
        }
      }
      return
    }

    onClose()
    try {
      await copyInviteLink(inviteUrl)
      onNotice('초대 링크가 복사 됐어요!')
    } catch {
      onNotice('링크 복사에 실패했어요. 주소창의 링크를 복사해 주세요.')
    }
  }

  return (
    <div
      className="rd-invite-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="rd-invite-title" aria-describedby="rd-invite-desc" className="rd-invite-modal">
        <div className="rd-invite-top">
          <div className="rd-invite-logo" aria-hidden="true">↗</div>
          <button type="button" onClick={onClose} aria-label="친구 초대 닫기" className="rd-invite-close">×</button>
        </div>
        <h3 id="rd-invite-title">카카오 친구 초대</h3>
        <p id="rd-invite-desc">친구에게 또랑 링크를 보내 함께 물길을 돌봐요. 휴대폰에서는 공유 메뉴를 열고, 데스크톱에서는 링크를 복사합니다.</p>
        <p className="rd-invite-note">현재는 앱 주소만 공유하며 친구 자동 추가 기능은 연결되지 않았습니다.</p>
        {['localhost', '127.0.0.1'].includes(window.location.hostname) && (
          <p className="rd-invite-local">로컬 개발 주소는 다른 사람의 기기에서 열 수 없습니다. 배포 후 실제 주소로 확인해 주세요.</p>
        )}
        <button type="button" onClick={() => { void handleShare() }} className="rd-invite-share">초대 링크 공유하기</button>
        <button type="button" onClick={onClose} className="rd-invite-cancel">취소</button>
      </section>
    </div>
  )
}
