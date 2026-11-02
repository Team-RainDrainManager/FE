import { create } from 'zustand'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  tokenType: string
}

const STORAGE_KEY = 'ddorang:auth-session'

function readTokens(): AuthTokens | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Partial<AuthTokens>
    if (typeof candidate.accessToken !== 'string' || typeof candidate.refreshToken !== 'string') return null
    return {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
      accessTokenExpiresIn: Number(candidate.accessTokenExpiresIn ?? 0),
      tokenType: 'Bearer',
    }
  } catch { return null }
}

const initial = readTokens()

type AuthStore = {
  accessToken: string | null
  refreshToken: string | null
  setTokens: (tokens: AuthTokens) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: initial?.accessToken ?? null,
  refreshToken: initial?.refreshToken ?? null,
  setTokens: (tokens) => {
    // 현재 브라우저 탭에서만 로그인 상태를 유지합니다. 영구 localStorage에는 저장하지 않습니다.
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)) } catch { /* 저장소 접근 불가 */ }
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  },
  clear: () => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* 저장소 접근 불가 */ }
    set({ accessToken: null, refreshToken: null })
  },
}))
