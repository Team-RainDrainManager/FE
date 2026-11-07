export type NicknameReport = {
  id: string
  targetId: string
  nickname: string
  createdAt: string
  status: 'pending-demo'
}
const REPORTS_KEY = 'ddorang:demo-nickname-reports'

/** 백엔드 신고 API가 없어 이 브라우저에만 저장하는 UI 시연입니다. */
export function storeDemoReport(targetId: string, nickname: string): boolean {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]')
    const previous = Array.isArray(saved) ? saved.filter((item): item is NicknameReport => Boolean(item && typeof item === 'object')) : []
    const next: NicknameReport = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, targetId, nickname, createdAt: new Date().toISOString(), status: 'pending-demo' }
    localStorage.setItem(REPORTS_KEY, JSON.stringify([...previous, next].slice(-100)))
    return true
  } catch { return false }
}
