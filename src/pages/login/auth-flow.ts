import { useAuthStore } from '../../store/useAuthStore'
import { fetchOnboardingStatus } from './onboarding-status-cache'

export const KAKAO_REDIRECT_PATH = '/oauth/kakao'
const OAUTH_PENDING = 'ddorang:kakao-redirect-pending'
const NICKNAME_PENDING = 'ddorang:onboarding-nickname-pending'

export function kakaoRedirectUri(): string {
  return `${window.location.origin}${KAKAO_REDIRECT_PATH}`
}

export function markKakaoRedirect() { sessionStorage.setItem(OAUTH_PENDING, '1') }
export function clearOnboardingProgress() {
  sessionStorage.removeItem(OAUTH_PENDING)
  sessionStorage.removeItem(NICKNAME_PENDING)
}
export function consumeKakaoRedirect() {
  const valid = sessionStorage.getItem(OAUTH_PENDING) === '1'
  sessionStorage.removeItem(OAUTH_PENDING)
  return valid
}
export function markNicknamePending() { sessionStorage.setItem(NICKNAME_PENDING, '1') }
export function clearNicknamePending() { sessionStorage.removeItem(NICKNAME_PENDING) }
export function needsNickname() { return sessionStorage.getItem(NICKNAME_PENDING) === '1' }
export function nextAfterCompletedOnboarding() { return '/my-drains' }

/** 기존 회원도 서버의 완료 여부를 매번 확인합니다. */
export async function nextAfterLogin(): Promise<string> {
  const token = useAuthStore.getState().accessToken
  if (!token) return '/login'
  const onboarding = await fetchOnboardingStatus(token)
  if (!onboarding.completed) return '/onboarding/terms'
  return nextAfterCompletedOnboarding()
}
