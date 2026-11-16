import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { checkNicknameAvailable, emailSignup, getErrorMessage } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { nextAfterLogin } from './auth-flow'
import { beginFirstRun } from '../../utils/firstRun'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import './auth-pages.css'
import { NICKNAME_LENGTH_HINT, validateNickname } from '../../features/nickname/nickname-policy'

export default function EmailSignupPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameToCheck, setNicknameToCheck] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const nicknameValidation = validateNickname(nickname)

  const nicknameCheck = useQuery({
    queryKey: ['user-nickname-availability', nicknameToCheck],
    queryFn: ({ signal }) => checkNicknameAvailable(nicknameToCheck, signal),
    enabled: nicknameToCheck !== '',
    retry: false,
    refetchOnWindowFocus: false,
  })
  const nicknameTaken = nicknameToCheck !== '' && nicknameCheck.isSuccess && !nicknameCheck.isFetching && !nicknameCheck.data
  let nicknameHint = NICKNAME_LENGTH_HINT
  if (nicknameTaken) {
    nicknameHint = '이미 사용 중인 닉네임이에요.'
  } else if (nicknameToCheck && !error) {
    if (nicknameCheck.isFetching) nicknameHint = '닉네임을 확인하고 있어요.'
    else if (nicknameCheck.isError) nicknameHint = '중복 확인을 못 했어요. 가입할 때 다시 확인해요.'
    else if (nicknameCheck.isSuccess) nicknameHint = '사용할 수 있는 닉네임이에요.'
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || nicknameTaken) return
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password)) {
      setError('비밀번호는 8~64자이며 영문과 숫자가 각각 1개 이상 필요합니다.'); return
    }
    if (!nicknameValidation.valid) { setError(nicknameValidation.reason); return }
    setPending(true); setError('')
    try {
      const tokens = await emailSignup(email.trim(), password, nicknameValidation.value)
      beginFirstRun()
      useMyDrainsStore.getState().reset()
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
      <input
        id="signup-nickname"
        required
        autoComplete="nickname"
        value={nickname}
        disabled={pending}
        onChange={(event) => {
          setNickname(event.target.value)
          setNicknameToCheck('')
          setError('')
        }}
        onBlur={() => setNicknameToCheck(nicknameValidation.valid ? nicknameValidation.value : '')}
        aria-describedby="signup-nickname-hint"
        aria-invalid={nicknameTaken}
      />
      <p id="signup-nickname-hint" role="status" className={nicknameTaken ? 'dd-auth-error' : 'dd-auth-explainer'}>
        {nicknameHint}
      </p>
      {error && <p role="alert" className="dd-auth-error">{error}</p>}
      <button type="submit" className="dd-auth-primary" disabled={pending || nicknameTaken}>{pending ? '가입 중…' : '계정 만들기'}</button>
    </form>
    <p className="dd-auth-switch">이미 계정이 있으신가요? <Link to="/login/email">이메일 로그인</Link></p>
  </main></div>
}
