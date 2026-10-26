
import type { MyDrain } from '../../types/myDrains'

const LEVEL_XP = 50
const MAX_LEVEL = 50

export const LEVELS = Array.from(
  { length: MAX_LEVEL + 1 },
  (_, level) => level,
)

export function levelStage(level: number): string {
  if (level === 0) return '돌봄을 기다려요'
  if (level < 5) return '깨끗해지는 중'
  if (level < 10) return '작은 씨앗'
  if (level < 15) return '새싹 또랑'
  if (level < 20) return '튼튼한 지킴이'
  if (level < 25) return '물길 도우미'
  if (level < 30) return '꽃봉오리'
  if (level < 35) return '꽃핀 또랑'
  if (level < 40) return '우리 동네 단짝'
  if (level < 45) return '현장 반장'
  if (level < 50) return '동네 수호자'
  return '전설의 또랑'
}

export function nextXP(drain: MyDrain): number {
  if (drain.level >= MAX_LEVEL) return 0

  return Math.max(
    0,
    (drain.level + 1) * LEVEL_XP - drain.xp,
  )
}

export function progressPercent(drain: MyDrain): number {
  if (drain.level >= MAX_LEVEL) return 100

  return Math.min(
    100,
    Math.max(0, ((drain.xp % LEVEL_XP) / LEVEL_XP) * 100),
  )
}

export function nextCareDate(drain: MyDrain): string {
  const date = new Date(
    Date.now() +
      (14 - drain.lastCareDaysAgo) * 24 * 60 * 60 * 1000,
  )

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
