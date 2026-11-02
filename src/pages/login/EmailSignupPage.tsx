import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { emailSignup, getErrorMessage } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { nextAfterLogin } from './auth-flow'
import { beginFirstRun } from '../../utils/firstRun'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import { useDecorationStore } from '../../store/useDecorationStore'
import './auth-pages.css'

export default function EmailSignupPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password)) {
      setError('비밀번호는 8~64자이며 영문과 숫자가 각각 1개 이상 필요합니다.'); return
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setError('닉네임은 2~20자로 입력해 주세요.'); return
    }
    setPending(true); setError('')
    try {
      const tokens = await emailSignup(email.trim(), password, nickname.trim())
      beginFirstRun()
      useMyDrainsStore.getState().reset()
      useDecorationStore.getState().reset()
      setTokens(tokens)
      navigate(await nextAfterLogin(), { replace: true })
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setPending(false) }
  }

  return <div className="dd-auth-page"><main className="dd-auth-card">
    <Link className="dd-auth-back" to="/login/email">‹ 로그인으로 돌아가기</Link>
    <p className="dd-auth-kicker">START WITH DDORANG</p>
    <h1>이메일 회원가입</h1>
    <p className="dd-auth-explainer">계정을 만든 뒤 약관 동의와 본인인증을 진행합니다.</p>
    <form onSubmit={submit} className="dd-auth-form">
      <label htmlFor="signup-email">이메일</label>
      <input id="signup-email" type="email" required autoComplete="email" maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
      <label htmlFor="signup-password">비밀번호</label>
      <input id="signup-password" type="password" autoComplete="new-password" minLength={8} maxLength={64} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8~64자, 영문과 숫자 포함" />
      <label htmlFor="signup-confirm">비밀번호 확인</label>
      <input id="signup-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="비밀번호 재입력" />
      <label htmlFor="signup-nickname">닉네임</label>
      <input id="signup-nickname" required minLength={2} maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="2~20자" />
      {error && <p role="alert" className="dd-auth-error">{error}</p>}
      <button type="submit" className="dd-auth-primary" disabled={pending}>{pending ? '가입 중…' : '계정 만들기'}</button>
    </form>
    <p className="dd-auth-switch">이미 계정이 있으신가요? <Link to="/login/email">이메일 로그인</Link></p>
  </main></div>
}
