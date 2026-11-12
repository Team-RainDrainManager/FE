/** 튜토리얼은 새 가입자의 브라우저 탭에서 한 번만 시작합니다. 서버 회원 기록과는 별개입니다. */
const TOUR_KEY = 'ddorang:first-tour-pending'

export function clearDemoAccountData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ddorang:demo-') || key.startsWith('ddorang:drain-name:') || key.startsWith('ddorang:last-level:') || key === 'ddorang:shop-demo' || key.startsWith('ddorang:mission-wallet:')) localStorage.removeItem(key)
    }
  } catch { /* ignore */ }
}
export function beginFirstRun() {
  // 신규 가입 시 이전 시연 세션이 보이지 않도록 시연 데이터만 정리합니다.
  clearDemoAccountData()
  try {
    sessionStorage.removeItem('ddorang:first-tour-step')
    sessionStorage.setItem(TOUR_KEY, '1')
  } catch { /* ignore */ }
}
export function hasPendingTour() {
  try { return sessionStorage.getItem(TOUR_KEY) === '1' } catch { return false }
}
export function finishFirstRun() {
  try { sessionStorage.removeItem(TOUR_KEY) } catch { /* ignore */ }
}
export function clearLocalDdorangiData() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('ddorang:')) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('ddorang:')) sessionStorage.removeItem(key)
  } catch { /* ignore */ }
}
