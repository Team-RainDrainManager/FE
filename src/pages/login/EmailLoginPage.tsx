import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { emailLogin, getErrorMessage } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { nextAfterLogin } from './auth-flow'
import './auth-pages.css'

export default function EmailLoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true); setError('')
    try {
      const tokens = await emailLogin(email.trim(), password)
      setTokens(tokens)
      navigate(await nextAfterLogin(), { replace: true })
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setPending(false) }
  }

  return <div className="dd-auth-page"><main className="dd-auth-card">
    <Link className="dd-auth-back" to="/login">‹ 로그인 방법 선택</Link>
    <p className="dd-auth-kicker">WELCOME BACK</p>
    <h1>이메일로 로그인</h1>
    <p className="dd-auth-explainer">계정에 로그인하고 우리 동네 또랑이를 돌봐요.</p>
    <form onSubmit={submit} className="dd-auth-form">
      <label htmlFor="login-email">이메일</label>
      <input id="login-email" type="email" autoComplete="username" required maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
      <label htmlFor="login-password">비밀번호</label>
      <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" />
      <label className="dd-auth-check"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} /> 비밀번호 보기</label>
      {error && <p role="alert" className="dd-auth-error">{error}</p>}
      <button type="submit" className="dd-auth-primary" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</button>
    </form>
    <p className="dd-auth-note">한 번 로그인하면 이 기기에서는 로그아웃할 때까지 유지돼요. 함께 쓰는 기기라면 설정에서 로그아웃해 주세요.</p>
    <p className="dd-auth-switch">아직 계정이 없으신가요? <Link to="/signup">이메일 회원가입</Link></p>
  </main></div>
}
