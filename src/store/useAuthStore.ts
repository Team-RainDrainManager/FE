import { create } from 'zustand'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  tokenType: string
}

const STORAGE_KEY = 'ddorang:auth-session'

function parseTokens(value: string | null): AuthTokens | null {
  if (!value) return null
  try {
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

/** 저장된 로그인 정보를 읽습니다. 다른 탭이 방금 갱신한 값을 확인할 때도 씁니다. */
export function readStoredTokens(): AuthTokens | null {
  try {
    const saved = parseTokens(localStorage.getItem(STORAGE_KEY))
    if (saved) return saved
    // 예전 버전은 탭에만 저장했습니다. 열려 있던 탭의 로그인은 그대로 이어 줍니다.
    const legacy = parseTokens(sessionStorage.getItem(STORAGE_KEY))
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
      sessionStorage.removeItem(STORAGE_KEY)
    }
    return legacy
  } catch { return null }
}

const initial = readStoredTokens()

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
    // 폰에서 앱을 닫았다 열거나 푸시 알림을 눌러 새 창으로 들어와도 로그인이 유지되도록
    // 기기에 저장합니다. 로그아웃·탈퇴 때 지웁니다.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)) } catch { /* 저장소 접근 불가 */ }
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
    } catch { /* 저장소 접근 불가 */ }
    set({ accessToken: null, refreshToken: null })
  },
}))

// 다른 탭에서 로그인·로그아웃하거나 토큰을 갱신하면 이 탭도 같은 상태로 맞춥니다.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage) return
    if (event.key !== null && event.key !== STORAGE_KEY) return
    const next = parseTokens(event.key === null ? null : event.newValue)
    const current = useAuthStore.getState()
    if ((next?.accessToken ?? null) === current.accessToken && (next?.refreshToken ?? null) === current.refreshToken) return
    useAuthStore.setState({ accessToken: next?.accessToken ?? null, refreshToken: next?.refreshToken ?? null })
  })
}
