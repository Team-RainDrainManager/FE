
import { Navigate, Route, Routes } from 'react-router'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/map" replace />} />

      <Route path="/map" element={<h1>지도 페이지</h1>} />
      <Route path="/my-drains" element={<h1>또랑이 페이지</h1>} />

      <Route path="/login" element={<h1>로그인 페이지</h1>} />
      <Route path="/notifications" element={<h1>알림 페이지</h1>} />
      <Route path="/profile" element={<h1>프로필 페이지</h1>} />

      <Route path="*" element={<h1>404 - 페이지를 찾을 수 없습니다.</h1>} />
    </Routes>
  )
}

export default App
