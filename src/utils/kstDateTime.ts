export const KST_TIME_ZONE = 'Asia/Seoul'

const DAY_MS = 24 * 60 * 60 * 1000
const SERVER_DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/i

const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: KST_TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: KST_TIME_ZONE,
})

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: KST_TIME_ZONE,
})

function parseServerDateTime(value: string | null | undefined): Date | null {
  const parts = value?.trim().match(SERVER_DATE_TIME)
  if (!parts) return null

  // 서버 LocalDateTime은 시차가 생략되면 한국 시각입니다.
  const [, day, time, offset = '+09:00'] = parts
  const date = new Date(`${day}T${time}${offset}`)
  return Number.isFinite(date.getTime()) ? date : null
}

export function getKstDayLabel(
  day: string | null | undefined,
  now: number,
): '오늘' | '내일' | null {
  if (!day) return null
  if (day === dayFormatter.format(now)) return '오늘'
  return day === dayFormatter.format(now + DAY_MS) ? '내일' : null
}

export function formatKstDateTime(value: string | null | undefined): string | null {
  const date = parseServerDateTime(value)
  return date ? dateTimeFormatter.format(date) : null
}

export function formatKstDayAndTime(
  value: string | null | undefined,
  now: number,
): string | null {
  const date = parseServerDateTime(value)
  if (!date) return null

  const label = getKstDayLabel(dayFormatter.format(date), now)
  return label ? `${label} ${timeFormatter.format(date)}` : dateTimeFormatter.format(date)
}
