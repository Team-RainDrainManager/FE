import { useRef } from 'react'
import Sheet from '../common/Sheet'
import SettingsPage from '../../pages/settings/SettingsPage'

export default function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const reportTriggerRef = useRef<HTMLButtonElement>(null)
  return (
    <Sheet title="설정" onClose={onClose}
      appearance={{ overlay: 'dd-settings-backdrop', panel: 'dd-settings-modal', grab: 'dd-settings-modal__grab', indicator: 'dd-settings-modal__grab-indicator', body: 'dd-settings-modal__scroll' }}
      onContentClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('a[href]')) onClose()
      }}
      heading={(
        <div className="dd-settings-modal__heading">
          <div>
            <p className="dd-settings-modal__eyebrow">MY DDORANG</p>
            <h2 id="dd-settings-modal-title">설정</h2>
          </div>
          <button type="button" className="ml-auto mr-3 min-h-9 text-xs font-semibold" onClick={() => {
            onClose()
            window.dispatchEvent(new Event('ddorang:replay-tour'))
          }}>튜토리얼 다시보기</button>
          <button type="button" className="dd-settings-modal__report" aria-label="버그 신고하기" title="버그 신고"
            onClick={() => reportTriggerRef.current?.click()}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 18v-7a6.5 6.5 0 0 1 13 0v7M3 21h18M8 17.5h8M12 1v2.5M3.4 5l2 2M20.6 5l-2 2" />
            </svg>
          </button>
        </div>
      )}
    >
      <SettingsPage embedded reportButtonRef={reportTriggerRef} />
    </Sheet>
  )
}
