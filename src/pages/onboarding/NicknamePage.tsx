import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { changeNickname, checkNicknameAvailable, getErrorMessage, getMe } from '../../apis/auth'
import { clearNicknamePending } from '../login/auth-flow'
import '../login/auth-pages.css'
import { NICKNAME_LENGTH_HINT, validateNickname } from '../../features/nickname/nickname-policy'

export default function NicknamePage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [currentNickname, setCurrentNickname] = useState('')
  const [nicknameToCheck, setNicknameToCheck] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const validation = validateNickname(nickname)
  const canCheckNickname = validation.valid && validation.value.toLowerCase() !== currentNickname.trim().toLowerCase()

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
    else if (nicknameCheck.isError) nicknameHint = '중복 확인을 못 했어요. 저장할 때 다시 확인해요.'
    else if (nicknameCheck.isSuccess) nicknameHint = '사용할 수 있는 닉네임이에요.'
  }

  useEffect(() => {
    let active = true
    getMe().then((me) => {
      if (!active) return
      setNickname(me.nickname ?? '')
      setCurrentNickname(me.nickname ?? '')
      setLoading(false)
    })
      .catch((err: unknown) => { if (active) { setError(getErrorMessage(err)); setLoading(false) } })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || nicknameTaken) return
    if (!validation.valid) { setError(validation.reason); return }
    setPending(true); setError('')
    try {
      await changeNickname(validation.value)
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
      <input
        id="onboarding-nickname"
        value={nickname}
        autoComplete="nickname"
        required
        disabled={pending}
        onChange={(event) => {
          setNickname(event.target.value)
          setNicknameToCheck('')
          setError('')
        }}
        onBlur={() => setNicknameToCheck(canCheckNickname ? validation.value : '')}
        aria-describedby="onboarding-nickname-hint"
        aria-invalid={nicknameTaken}
      />
      <p id="onboarding-nickname-hint" role="status" className={nicknameTaken ? 'dd-auth-error' : 'dd-auth-explainer'}>
        {nicknameHint}
      </p>
      {error && <p role="alert" className="dd-auth-error">{error}</p>}
      <button type="submit" disabled={pending || nicknameTaken} className="dd-auth-primary">{pending ? '저장 중…' : '또랑이 시작하기'}</button>
    </form>}
  </main></div>
}
