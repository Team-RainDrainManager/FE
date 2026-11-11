const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
})

/** 서버 시각을 '11월 10일 18:04' 형태로 보여 줍니다. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '시각 정보 없음'
  const time = new Date(value)
  return Number.isFinite(time.getTime()) ? dateTimeFormat.format(time) : '시각 정보 없음'
}
