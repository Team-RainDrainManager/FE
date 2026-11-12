import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage, kakaoLogin } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { consumeKakaoRedirect, kakaoRedirectUri, nextAfterLogin } from './auth-flow'
import { beginFirstRun } from '../../utils/firstRun'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import './auth-pages.css'

export default function KakaoCallbackPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const invoked = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (invoked.current) return
    invoked.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (params.get('error')) {
      queueMicrotask(() => setError('카카오 로그인이 취소되었거나 승인되지 않았습니다.'))
      consumeKakaoRedirect()
      return
    }
    if (!code || !consumeKakaoRedirect()) {
      queueMicrotask(() => setError('로그인 요청을 확인할 수 없습니다. 로그인 화면에서 다시 시도해 주세요.'))
      return
    }
    // 인가 코드는 URL에서 즉시 제거하여 히스토리·화면 공유로 노출되지 않도록 합니다.
    window.history.replaceState({}, '', '/oauth/kakao')
    const execute = async () => {
      try {
        const tokens = await kakaoLogin(code, kakaoRedirectUri())
        if (tokens.isNewUser) {
          beginFirstRun()
          useMyDrainsStore.getState().reset()
        }
        setTokens(tokens)
        navigate(await nextAfterLogin(), { replace: true })
      } catch (err: unknown) { setError(getErrorMessage(err)) }
    }
    void execute()
  }, [navigate, setTokens])

  return <div className="dd-auth-page"><main className="dd-auth-card" aria-live="polite">
    <p className="dd-auth-kicker">DDORANG</p>
    <h1>{error ? '카카오 로그인에 실패했어요' : '카카오 로그인 중이에요'}</h1>
    <p className="dd-auth-explainer" role={error ? 'alert' : 'status'}>{error || '로그인 정보를 확인하고 있어요.'}</p>
    {error && <Link className="dd-auth-primary" to="/login">로그인 화면으로 돌아가기</Link>}
  </main></div>
}
