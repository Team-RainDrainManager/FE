import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage, logout } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { clearOnboardingProgress } from '../login/auth-flow'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import { queryClient } from '../../apis/query-client'

export default function SettingsPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clear)
  const clearOnboarding = useOnboardingStore((state) => state.clear)
  const clearMyDrains = useMyDrainsStore((state) => state.reset)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    let logoutNotice = ''
    try {
      await logout()
    } catch (error: unknown) {
      logoutNotice = `${getErrorMessage(error)} 기기에 저장된 로그인 정보는 삭제했지만 서버 로그아웃은 확인되지 않았습니다.`
    } finally {
      // 서버 응답이 실패하더라도 기기에서 인증 정보와 계정별 상태를 지웁니다.
      clearAuth()
      clearOnboardingProgress()
      clearOnboarding()
      clearMyDrains()
      queryClient.clear()
      try {
        localStorage.removeItem('ddorang:demo-profile-name')
        localStorage.removeItem('ddorang:demo-profile-photo')
      } catch { /* 저장소 접근 제한 */ }
      setLoggingOut(false)
      navigate('/login', { replace: true, state: logoutNotice ? { logoutNotice } : null })
    }
  }

  return (
    <div className="min-h-[calc(100dvh-128px)] space-y-4 bg-[#F7FAFE] px-[18px] pb-8 pt-5 text-[#24496B]">
      <section className="rounded-[22px] border border-[#E5EEF7] bg-white p-5">
        <h2 className="text-[15px] font-extrabold">계정</h2>
        <p className="mt-2 text-[12px] text-[#8299B0]">현재 계정에서 안전하게 로그아웃합니다.</p>
        <button type="button" disabled={loggingOut} onClick={() => { void handleLogout() }} className="mt-3 min-h-11 w-full rounded-xl bg-[#EFF6FF] text-[13px] font-bold text-[#367AC0] disabled:opacity-60">
          {loggingOut ? '로그아웃 중…' : '로그아웃'}
        </button>
      </section>

      <section className="rounded-[22px] border border-[#E5EEF7] bg-white p-5">
        <h2 className="text-[15px] font-extrabold">서비스 정보</h2>
        <p className="mt-2 text-[12px] leading-5 text-[#8299B0]">또랑 · 우리 동네 빗물받이 돌봄 서비스</p>
        <Link to="/profile" className="mt-4 inline-block text-[12px] font-bold text-[#338CF0]">프로필로 돌아가기 ›</Link>
      </section>
    </div>
  )
}
