
import { Navigate, Route, Routes } from 'react-router'
import MainLayout from './layouts/MainLayout'

export default function App() {
  return (
    <Routes>
      {/* 로그인 - 공통 레이아웃 제외 */}
      <Route path="/login" element={null} />

      {/* 공통 레이아웃 */}
      <Route element={<MainLayout />}>
        <Route path="/" element={null} />
        <Route path="/my-drains" element={null} />
        <Route path="/map" element={null} />
        <Route path="/social" element={null} />
        <Route path="/notifications" element={null} />
        <Route path="/profile" element={null} />
        <Route path="/settings" element={null} />
      </Route>

      {/* 잘못된 URL 처리 */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}
