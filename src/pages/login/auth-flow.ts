import { useAuthStore } from '../../store/useAuthStore'
import { fetchOnboardingStatus } from './onboarding-status-cache'

export const KAKAO_REDIRECT_PATH = '/oauth/kakao'
const OAUTH_PENDING = 'ddorang:kakao-redirect-pending'
const NICKNAME_PENDING = 'ddorang:onboarding-nickname-pending'
const RETURN_TO = 'ddorang:return-to'
// 카카오 로그인 화면에 머무를 수 있는 시간입니다. 이보다 오래된 요청은 받지 않습니다.
const OAUTH_PENDING_MS = 10 * 60 * 1000

export function kakaoRedirectUri(): string {
  return `${window.location.origin}${KAKAO_REDIRECT_PATH}`
}

// 홈 화면에 추가한 앱(아이폰)은 카카오 화면을 다른 창에서 열었다가 돌아오므로
// 탭에만 남는 저장소 대신 시각을 적어 기기에 남깁니다.
export function markKakaoRedirect() {
  try { localStorage.setItem(OAUTH_PENDING, String(Date.now())) } catch { /* 저장소 접근 불가 */ }
}
export function clearOnboardingProgress() {
  try { localStorage.removeItem(OAUTH_PENDING) } catch { /* 저장소 접근 불가 */ }
  sessionStorage.removeItem(OAUTH_PENDING)
  sessionStorage.removeItem(NICKNAME_PENDING)
}
export function consumeKakaoRedirect() {
  try {
    const startedAt = Number(localStorage.getItem(OAUTH_PENDING) ?? '0')
    localStorage.removeItem(OAUTH_PENDING)
    const age = Date.now() - startedAt
    return startedAt > 0 && age >= 0 && age <= OAUTH_PENDING_MS
  } catch { return false }
}
export function markNicknamePending() { sessionStorage.setItem(NICKNAME_PENDING, '1') }
export function clearNicknamePending() { sessionStorage.removeItem(NICKNAME_PENDING) }
export function needsNickname() { return sessionStorage.getItem(NICKNAME_PENDING) === '1' }

/** 로그인 전에 보려던 화면을 기억합니다. 푸시 알림을 눌러 들어온 경우 로그인 뒤 그 화면으로 보냅니다. */
export function rememberReturnTo(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return
  if (path === '/' || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/oauth') || path.startsWith('/onboarding')) return
  try { sessionStorage.setItem(RETURN_TO, path) } catch { /* 저장소 접근 불가 */ }
}
function consumeReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO)
    sessionStorage.removeItem(RETURN_TO)
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null
  } catch { return null }
}
export function nextAfterCompletedOnboarding() { return '/my-drains' }

/** 기존 회원도 서버의 완료 여부를 매번 확인합니다. */
export async function nextAfterLogin(): Promise<string> {
  const token = useAuthStore.getState().accessToken
  if (!token) return '/login'
  const onboarding = await fetchOnboardingStatus(token)
  if (!onboarding.completed) return '/onboarding/terms'
  return consumeReturnTo() ?? nextAfterCompletedOnboarding()
}
