import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { getOnboarding, getErrorMessage } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { nextAfterCompletedOnboarding } from './auth-flow'

export default function AuthGuard({ children, mode }: { children: ReactNode; mode: 'main' | 'onboarding' }) {
  const { pathname } = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [check, setCheck] = useState<{ key: string; result: 'complete' | 'incomplete' | 'error'; error?: string } | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    getOnboarding().then((status) => {
      if (active) setCheck({ key: accessToken, result: status.completed ? 'complete' : 'incomplete' })
    }).catch((error: unknown) => {
      if (active) setCheck({ key: accessToken, result: 'error', error: getErrorMessage(error) })
    })
    return () => { active = false }
  }, [accessToken, retry])

  if (!accessToken) return <Navigate to="/login" replace state={{ from: pathname }} />
  if (!check || check.key !== accessToken) return <div className="dd-auth-loading" role="status">로그인 상태를 확인하고 있어요…</div>
  if (check.result === 'error') return (
    <div className="dd-auth-error-page">
      <p role="alert">{check.error}</p>
      <button type="button" onClick={() => { setCheck(null); setRetry((n) => n + 1) }}>다시 시도</button>
    </div>
  )
  if (mode === 'main' && check.result === 'incomplete') return <Navigate to="/onboarding/terms" replace />
  if (mode === 'onboarding' && check.result === 'complete') {
    return <Navigate to={nextAfterCompletedOnboarding()} replace />
  }
  return <>{children}</>
}
