import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { getErrorMessage, type OnboardingStatus } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { nextAfterCompletedOnboarding, needsNickname, rememberReturnTo } from './auth-flow'
import { syncPushTokenIfAllowed } from '../../services/push-messaging'
import {
  clearOnboardingStatusCache,
  fetchOnboardingStatus,
  readOnboardingStatus,
} from './onboarding-status-cache'

type Check = { token: string; status: OnboardingStatus } | { token: string; error: string }

export default function AuthGuard({ children, mode }: { children: ReactNode; mode: 'main' | 'onboarding' }) {
  const { pathname, search } = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [check, setCheck] = useState<Check | null>(null)
  const [retry, setRetry] = useState(0)
  // 로그인 없이 들어온 경우에만 보려던 화면을 기억합니다. (로그아웃으로 나가는 경우는 제외)
  const [arrivedLoggedOut] = useState(() => !accessToken)

  useEffect(() => {
    if (!accessToken && arrivedLoggedOut && mode === 'main') rememberReturnTo(pathname + search)
  }, [accessToken, arrivedLoggedOut, mode, pathname, search])

  useEffect(() => {
    if (!accessToken) return
    let active = true
    // A navigation to another tab is NOT a new sign-in. Only check a new
    // session/token, or retry a failed check. Also deduplicates StrictMode.
    void fetchOnboardingStatus(accessToken).then((status) => {
      if (active) {
        setCheck({ token: accessToken, status })
        if (status.completed) {
          // 이미 브라우저 알림을 허용한 사용자만 등록합니다. 권한 팝업은 띄우지 않습니다.
          void syncPushTokenIfAllowed().catch(() => { /* 설정 스위치에서 재시도할 수 있습니다. */ })
        }
      }
    }).catch((error: unknown) => {
      if (active) setCheck({ token: accessToken, error: getErrorMessage(error) })
    })
    return () => { active = false }
  }, [accessToken, retry])

  if (!accessToken) return <Navigate to="/login" replace state={{ from: pathname }} />

  // A completed onboarding POST refreshes the shared cache synchronously.
  // This also prevents an old 'incomplete' result from blocking the nickname step.
  const status = readOnboardingStatus(accessToken) ??
    (check?.token === accessToken && 'status' in check ? check.status : null)
  if (!status) {
    if (check?.token === accessToken && 'error' in check) return (
      <div className="dd-auth-error-page">
        <p role="alert">{check.error}</p>
        <button type="button" onClick={() => {
          clearOnboardingStatusCache()
          setCheck(null)
          setRetry((value) => value + 1)
        }}>다시 시도</button>
      </div>
    )
    return <div className="dd-auth-loading" role="status">로그인 상태를 확인하고 있어요…</div>
  }

  if (mode === 'main' && !status.completed) return <Navigate to="/onboarding/terms" replace />
  if (mode === 'onboarding') {
    if (status.completed) {
      // After accepting terms and verification, nickname setup is still a real step.
      if (pathname === '/onboarding/nickname' && needsNickname()) return <>{children}</>
      return <Navigate to={nextAfterCompletedOnboarding()} replace />
    }
    if (pathname === '/onboarding/nickname') return <Navigate to="/onboarding/terms" replace />
  }
  return <>{children}</>
}
