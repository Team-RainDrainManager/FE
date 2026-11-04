import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { changeNickname, getErrorMessage, getMe } from '../../apis/auth'
import { clearNicknamePending } from '../login/auth-flow'
import '../login/auth-pages.css'

export default function NicknamePage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getMe().then((me) => { if (active) { setNickname(me.nickname ?? ''); setLoading(false) } })
      .catch((err: unknown) => { if (active) { setError(getErrorMessage(err)); setLoading(false) } })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = nickname.trim()
    if (value.length < 2 || value.length > 20) { setError('닉네임은 2~20자로 입력해 주세요.'); return }
    setPending(true); setError('')
    try {
      await changeNickname(value)
      clearNicknamePending()
      // 기존 시연용 프로필 닉네임과 혼동되지 않도록 새 이름도 동기화합니다.
      try { localStorage.removeItem('ddorang:demo-profile-name') } catch { /* 저장소 접근 불가 */ }
      navigate('/', { replace: true })
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setPending(false) }
  }

  return <div className="dd-auth-page"><main className="dd-auth-card">
    <p className="dd-auth-kicker">STEP 03 / 03</p>
    <h1>어떻게 불러드릴까요?</h1>
    <p className="dd-auth-explainer">또랑이에서 사용할 닉네임을 설정해 주세요.</p>
    {loading ? <p role="status">계정 정보를 불러오는 중이에요…</p> : <form className="dd-auth-form" onSubmit={submit}>
      <label htmlFor="onboarding-nickname">닉네임</label>
      <input id="onboarding-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} minLength={2} maxLength={20} autoComplete="nickname" required placeholder="2~20자" />
      {error && <p role="alert" className="dd-auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="dd-auth-primary">{pending ? '저장 중…' : '또랑이 시작하기'}</button>
    </form>}
  </main></div>
}
