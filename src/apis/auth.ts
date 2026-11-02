import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiClient } from './axios-instance'
import { useAuthStore, type AuthTokens } from '../store/useAuthStore'

export type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: { code: string; message: string; fieldErrors?: { field?: string; message?: string }[] } | null
}

export type KakaoLoginResponse = AuthTokens & { isNewUser: boolean }
export type OnboardingStatus = {
  completed: boolean
  completedAt: string | null
  identityVerified: boolean
  pendingRequiredTerms: TermsItem[]
}
export type TermsItem = {
  termsId: number
  type: string
  version: number
  title: string
  required: boolean
  hasContent: boolean
  displayOrder: number
}
export type TermsContent = Omit<TermsItem, 'hasContent' | 'displayOrder'> & { content: string | null }
export type Agreement = { termsId: number; agreed: boolean }
export type MeResponse = {
  id: number
  nickname: string
  email: string | null
  profileImage: string | null
  onboardingCompleted: boolean
  identityVerified: boolean
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const body = response.data
  if (!body.success) throw new Error(body.error?.message || '서버 요청을 처리하지 못했습니다.')
  return body.data
}

const publicClient = axios.create({ baseURL: apiClient.defaults.baseURL, timeout: 15000 })

// Refresh token rotation: 동시에 두 요청이 실패해도 새로고침은 한 번만 수행합니다.
let refreshPromise: Promise<AuthTokens> | null = null

export async function refreshSession(): Promise<AuthTokens> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) throw new Error('로그인이 필요합니다.')
      const tokens = unwrap<AuthTokens>(await publicClient.post('/api/v1/auth/refresh', { refreshToken }))
      // 로그아웃 도중 완료된 리프레시 요청으로 세션이 다시 살아나는 것을 방지합니다.
      if (useAuthStore.getState().refreshToken !== refreshToken) {
        throw new Error('로그인 세션이 종료되었습니다.')
      }
      useAuthStore.getState().setTokens(tokens)
      return tokens
    })().catch((error: unknown) => {
      useAuthStore.getState().clear()
      throw error
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

type RetryRequest = InternalAxiosRequestConfig & { _retry?: boolean }
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetryRequest | undefined
  const isAuthUrl = original?.url?.startsWith('/api/v1/auth/')
  if (error.response?.status !== 401 || !original || original._retry || isAuthUrl) {
    return Promise.reject(error)
  }
  original._retry = true
  try {
    const tokens = await refreshSession()
    original.headers.set('Authorization', `Bearer ${tokens.accessToken}`)
    return apiClient(original)
  } catch {
    return Promise.reject(error)
  }
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    const detail = error.response?.data?.error
    if (detail?.fieldErrors?.length) {
      return detail.fieldErrors.map((item) => item.message).filter(Boolean).join('\n') || detail.message
    }
    return detail?.message || (error.response ? `요청 실패 (${error.response.status})` : '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.')
  }
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
}

export async function getKakaoLoginUrl(redirectUri: string): Promise<string> {
  const result = unwrap<{ url: string }>(await publicClient.get('/api/v1/auth/kakao/login-url', { params: { redirectUri } }))
  return result.url
}

export async function kakaoLogin(code: string, redirectUri: string): Promise<KakaoLoginResponse> {
  return unwrap<KakaoLoginResponse>(await publicClient.post('/api/v1/auth/kakao', { code, redirectUri }))
}
export async function emailLogin(email: string, password: string): Promise<AuthTokens> {
  return unwrap<AuthTokens>(await publicClient.post('/api/v1/auth/login', { email, password }))
}
export async function emailSignup(email: string, password: string, nickname: string): Promise<AuthTokens> {
  return unwrap<AuthTokens>(await publicClient.post('/api/v1/auth/signup', { email, password, nickname }))
}
export async function getOnboarding(): Promise<OnboardingStatus> {
  return unwrap<OnboardingStatus>(await apiClient.get('/api/v1/users/me/onboarding'))
}
export async function getTerms(): Promise<TermsItem[]> {
  return unwrap<TermsItem[]>(await publicClient.get('/api/v1/terms'))
}
export async function getTermsContent(termsId: number): Promise<TermsContent> {
  return unwrap<TermsContent>(await publicClient.get(`/api/v1/terms/${termsId}`))
}
export async function completeOnboarding(agreements: Agreement[]): Promise<OnboardingStatus> {
  return unwrap<OnboardingStatus>(await apiClient.post('/api/v1/users/me/onboarding', {
    agreements,
    identityVerified: true, // 백엔드의 현재 온보딩 임시 인증 플래그. 실제 본인인증 연동 전 운영 배포 금지
  }))
}
export async function getMe(): Promise<MeResponse> {
  return unwrap<MeResponse>(await apiClient.get('/api/v1/users/me'))
}
export async function changeNickname(nickname: string): Promise<void> {
  unwrap(await apiClient.patch('/api/v1/users/me', { nickname }))
}
export async function logout(): Promise<void> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return
  unwrap(await apiClient.post('/api/v1/auth/logout', { refreshToken }))
}
