// AI 판정 등급과 더러움 단계는 1~3 기준을 함께 사용합니다.
const DIRT_LEVEL_LABELS: Record<number, string> = {
  1: '괜찮음',
  2: '쌓임',
  3: '막힘',
}

const UNKNOWN = '정보 없음'

export function gradeLabel(grade: number | null | undefined): string {
  // 이전 응답의 괜찮음 값도 표시할 수 있게 처리합니다.
  return dirtLevelLabel(grade === 0 ? 1 : grade)
}

export function dirtLevelLabel(level: number | null | undefined): string {
  return level == null ? UNKNOWN : DIRT_LEVEL_LABELS[level] ?? UNKNOWN
}
