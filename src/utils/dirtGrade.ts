// 빗물받이 등급 표시 (촬영기 기준 v6, 3단계). 서버 값은 등급 0·2·3, 더러움 단계 1·2·3입니다.
// 등급 1은 옛 기준 '조금 쌓임'으로 예전 점검 기록에만 남아 있습니다.
const GRADE_LABELS: Record<number, string> = {
  0: '괜찮음',
  1: '조금 쌓임',
  2: '쌓임',
  3: '막힘',
}

const DIRT_LEVEL_LABELS: Record<number, string> = {
  1: '괜찮음',
  2: '쌓임',
  3: '막힘',
}

const UNKNOWN = '정보 없음'

export function gradeLabel(grade: number | null | undefined): string {
  return grade == null ? UNKNOWN : GRADE_LABELS[grade] ?? UNKNOWN
}

export function dirtLevelLabel(level: number | null | undefined): string {
  return level == null ? UNKNOWN : DIRT_LEVEL_LABELS[level] ?? UNKNOWN
}
