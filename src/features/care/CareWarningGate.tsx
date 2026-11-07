import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyAdoptions } from '../../apis/my-drains'
import { getPauseStatus } from '../../apis/profile-settings'
import { useAuthStore } from '../../store/useAuthStore'
import '../account/sanctions-warning.css'

/** 서버가 내려주는 releaseWarning 이 참일 때만 경고합니다. 28/35일 경과를 프론트에서 재판정하지 않습니다. */
export default function CareWarningGate() {
  const token = useAuthStore(state => state.accessToken)
  const [dismissedId, setDismissedId] = useState<number | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const adoptions = useQuery({ queryKey: ['my-adoptions'], queryFn: ({ signal }) => getMyAdoptions(signal), enabled: Boolean(token), staleTime: 30_000 })
  const pause = useQuery({ queryKey: ['pause-status'], queryFn: getPauseStatus, enabled: Boolean(token), staleTime: 30_000 })
  const warning = adoptions.data?.adoptions.find(item => item.releaseWarning && item.adoptionId !== dismissedId)
  const until = pause.data?.activeUntil
  useEffect(() => {
    // 시간 조회는 렌더링 밖에서 실행하여 React 순수성 규칙을 지킵니다.
    const updateNow = () => setNow(Date.now())
    const initialTimer = window.setTimeout(updateNow, 0)
    const interval = window.setInterval(updateNow, 30_000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(interval)
    }
  }, [])
  const paused = now !== null && typeof until === 'string' && new Date(until).getTime() > now
  const show = Boolean(now !== null && token && adoptions.isSuccess && pause.isSuccess && warning && !paused)
  if (!show || !warning) return null
  return createPortal(
    <div className="dd21-care-warning-overlay" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="dd21-care-warning-title" aria-describedby="dd21-care-warning-text" className="dd21-care-warning-box">
        <h2 id="dd21-care-warning-title">미관리 경고</h2>
        <p id="dd21-care-warning-text" className="dd21-care-warning-message">{warning.nickname || `빗물받이 #${warning.drainId}`}의 관리 기한이 초과되어 미관리 경고가 발생했습니다. 서버 정책에 따라 28일 미관리 시 경고, 35일 미관리 시 입양이 자동 해제될 수 있습니다.</p>
        <div className="dd21-care-warning-actions">
          <button type="button" onClick={() => setDismissedId(warning.adoptionId)}>확인</button>
          <Link to="/my-drains" onClick={() => setDismissedId(warning.adoptionId)}>또랑이 확인</Link>
        </div>
      </section>
    </div>, document.body,
  )
}
