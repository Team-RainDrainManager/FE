import { getOnboarding, type OnboardingStatus } from '../../apis/auth'

/**
 * Per-access-token onboarding lookup shared by the guard and post-login flow.
 * A successful response is reused during tab navigation; a failed request is
 * evicted so the Retry action can actually contact the server again.
 */
let cached: {
  token: string
  promise: Promise<OnboardingStatus>
  value: OnboardingStatus | null
} | null = null

export function readOnboardingStatus(token: string): OnboardingStatus | null {
  return cached?.token === token ? cached.value : null
}

export function fetchOnboardingStatus(token: string): Promise<OnboardingStatus> {
  if (cached?.token === token) return cached.promise
  const request = getOnboarding()
  const entry = { token, promise: request, value: null as OnboardingStatus | null }
  cached = entry
  void request.then(
    (value) => { if (cached === entry) entry.value = value },
    () => { if (cached === entry) cached = null },
  )
  return request
}

export function markOnboardingCompleted(token: string, status: OnboardingStatus): void {
  cached = { token, promise: Promise.resolve(status), value: status }
}

export function clearOnboardingStatusCache(): void {
  cached = null
}
