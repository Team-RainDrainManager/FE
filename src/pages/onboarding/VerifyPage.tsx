import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { completeOnboarding, getErrorMessage } from '../../apis/auth'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { clearOnboardingProgress } from '../login/auth-flow'
import { markNicknamePending } from '../login/auth-flow'
import '../login/auth-pages.css'

export default function VerifyPage() {
  const navigate = useNavigate()
  const terms = useOnboardingStore((state) => state.terms)
  const agreements = useOnboardingStore((state) => state.agreements)
  const clear = useOnboardingStore((state) => state.clear)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const canComplete = terms.length > 0 && terms.every((item) => !item.required || agreements.some((a) => a.termsId === item.termsId && a.agreed))

  async function proceed() {
    if (!canComplete) { navigate('/onboarding/terms'); return }
    setPending(true); setError('')
    try {
      const result = await completeOnboarding(agreements)
      if (!result.completed) throw new Error('온보딩 완료 상태를 확인하지 못했습니다.')
      clearOnboardingProgress()
      clear()
      markNicknamePending()
      navigate('/onboarding/nickname', { replace: true })
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setPending(false) }
  }

  return <div className="dd-auth-page"><main className="dd-auth-card">
    <p className="dd-auth-kicker">STEP 02 / 02</p>
    <h1>가입 마무리</h1>
    <div className="dd-auth-verification-symbol" aria-hidden="true">✓</div>
    <p className="dd-auth-explainer">약관 동의 내용을 확인하고 가입을 마무리해 주세요. 완료하면 나의 또랑이 화면으로 이동합니다.</p>
    {error && <p role="alert" className="dd-auth-error">{error}</p>}
    <button type="button" disabled={pending || !canComplete} className="dd-auth-primary" onClick={() => { void proceed() }}>{pending ? '처리 중…' : '또랑이 시작하기'}</button>
    <Link className="dd-auth-secondary" to="/onboarding/terms">약관 동의로 돌아가기</Link>
  </main></div>
}
