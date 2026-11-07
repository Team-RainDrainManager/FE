import { useEffect, useState, type ReactNode } from 'react'
import { getMe } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import NicknameChangeDialog from './NicknameChangeDialog'

/** 서버 닉네임이 '이용제한'일 때만 강제 변경 UI를 표시합니다. 제재 자체는 서버가 수행해야 합니다. */
export default function NicknameRestrictionGate({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore(state => state.accessToken)
  const [checked, setChecked] = useState(false)
  const [restricted, setRestricted] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    let active = true
    void getMe().then(me => {
      if (!active) return
      setRestricted(me.nickname === '이용제한')
    }).catch(() => {
      // 상태 조회 실패만으로 정상 이용자를 제재하지 않습니다.
      if (active) setRestricted(false)
    }).finally(() => { if (active) setChecked(true) })
    return () => { active = false }
  }, [accessToken])

  if (!checked) return <div className="dd-auth-loading" role="status">계정 상태를 확인하고 있어요…</div>
  if (restricted) return <>
    <div aria-hidden="true" className="min-h-dvh bg-[#f5f9ff]" />
    <NicknameChangeDialog currentNickname="이용제한" forced onChanged={() => setRestricted(false)} />
  </>
  return <>{children}</>
}
