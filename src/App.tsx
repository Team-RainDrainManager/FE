import { Navigate, Route, Routes } from 'react-router'
import type { ReactNode } from 'react'
import { useAuthStore } from './store/useAuthStore'

import MainLayout from './layouts/MainLayout'
import MyDrainsPage from './pages/mydrains/MyDrainsPage'
import DrainDetailPage from './pages/drainDetail/DrainDetailPage'
import MapPage from './pages/map/MapPage'
import SocialPage from './pages/social/SocialPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import LoginPage from './pages/login/LoginPage'
import MyPage from './pages/profile/MyPage'
import AdminPage from './pages/admin/AdminPage'
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/settings/SettingsPage'
import { useQuery } from '@tanstack/react-query'
import { getMyAdoptions } from './apis/my-drains'
import AuthGuard from './pages/login/AuthGuard'
import KakaoCallbackPage from './pages/login/KakaoCallbackPage'
import EmailLoginPage from './pages/login/EmailLoginPage'
import EmailSignupPage from './pages/login/EmailSignupPage'
import TermsPage from './pages/onboarding/TermsPage'
import VerifyPage from './pages/onboarding/VerifyPage'
import NicknamePage from './pages/onboarding/NicknamePage'
import ModalScrollLock from './components/common/ModalScrollLock'
import NicknameRestrictionGate from './features/nickname/NicknameRestrictionGate'

/** 로그인한 사용자는 로그인·회원가입 화면으로 다시 들어가지 않습니다. */
function GuestOnly({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  return accessToken ? <Navigate to="/" replace /> : <>{children}</>
}

function HomeRedirect() {
  // 입양한 또랑이가 있으면 내 또랑이로, 없으면 지도로 보냅니다.
  const { data, isPending } = useQuery({
    queryKey: ['my-adoptions'],
    queryFn: ({ signal }) => getMyAdoptions(signal),
    staleTime: 30_000,
    retry: false,
  })
  if (isPending) return <div className="dd-auth-loading" role="status">또랑이를 불러오고 있어요…</div>
  return <Navigate to={data && data.adoptions.length > 0 ? '/my-drains' : '/map'} replace />
}

export default function App() {
  return (
    <>
    <ModalScrollLock />
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/login/email" element={<GuestOnly><EmailLoginPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><EmailSignupPage /></GuestOnly>} />
      <Route path="/oauth/kakao" element={<KakaoCallbackPage />} />
      <Route path="/onboarding/terms" element={<AuthGuard mode="onboarding"><TermsPage /></AuthGuard>} />
      <Route path="/onboarding/verify" element={<AuthGuard mode="onboarding"><VerifyPage /></AuthGuard>} />
      <Route path="/onboarding/nickname" element={<AuthGuard mode="onboarding"><NicknamePage /></AuthGuard>} />

      <Route element={<AuthGuard mode="main"><NicknameRestrictionGate><MainLayout /></NicknameRestrictionGate></AuthGuard>}>
        <Route index element={<HomeRedirect />} />
        <Route path="/my-drains" element={<MyDrainsPage />} />
        <Route path="/drains/:drainId" element={<DrainDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/notifications"element={<NotificationsPage />} />
        <Route path="/profile/mypage" element={<MyPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
    </>
  )
}