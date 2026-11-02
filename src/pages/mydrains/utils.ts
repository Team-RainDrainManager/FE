
export function formatCareDate(value: string | null): string {
  if (!value) return '기록 없음'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '날짜 확인 필요'
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isPauseActive(
  pauseUntil: string | null,
): boolean {
  if (!pauseUntil) return false

  const date = new Date(pauseUntil)

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() > Date.now()
  )
}
