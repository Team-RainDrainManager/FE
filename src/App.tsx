
import { Navigate, Route, Routes } from 'react-router'

import MainLayout from './layouts/MainLayout'
import MyDrainsPage from './pages/mydrains/MyDrainsPage'
import DrainDetailPage from './pages/drainDetail/DrainDetailPage'
import MapPage from './pages/map/MapPage'
import SocialPage from './pages/social/SocialPage'
import LeaderboardPage from './pages/social/LeaderboardPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import LoginPage from './pages/login/LoginPage'
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/settings/SettingsPage'
import { useMyDrainsStore } from './store/useMyDrainsStore'
import AuthGuard from './pages/login/AuthGuard'
import KakaoCallbackPage from './pages/login/KakaoCallbackPage'
import EmailLoginPage from './pages/login/EmailLoginPage'
import EmailSignupPage from './pages/login/EmailSignupPage'
import TermsPage from './pages/onboarding/TermsPage'
import VerifyPage from './pages/onboarding/VerifyPage'

function HomeRedirect() {
  // 현재 입양 목록을 기준으로 첫 탭을 결정합니다.
  const hasAdoption = useMyDrainsStore((state) => state.data.adoptions.length > 0)
  return <Navigate to={hasAdoption ? '/my-drains' : '/map'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/email" element={<EmailLoginPage />} />
      <Route path="/signup" element={<EmailSignupPage />} />
      <Route path="/oauth/kakao" element={<KakaoCallbackPage />} />
      <Route path="/onboarding/terms" element={<AuthGuard mode="onboarding"><TermsPage /></AuthGuard>} />
      <Route path="/onboarding/verify" element={<AuthGuard mode="onboarding"><VerifyPage /></AuthGuard>} />

      <Route element={<AuthGuard mode="main"><MainLayout /></AuthGuard>}>
        <Route index element={<HomeRedirect />} />
        <Route path="/my-drains" element={<MyDrainsPage />} />
        <Route path="/drains/:drainId" element={<DrainDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/social/leaderboard" element={<LeaderboardPage />} />
        <Route path="/notifications"element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
