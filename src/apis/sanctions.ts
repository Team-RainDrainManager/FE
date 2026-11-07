import { apiClient } from './axios-instance'

export type MySanction = {
  id: string
  reason: string | null
  type: string | null
  status: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string | null
  days: number | null
}

type Envelope = {
  success: boolean
  data: unknown
  error?: { message?: string; reason?: string } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function textField(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function dateField(item: Record<string, unknown>, keys: string[]): string | null {
  return textField(item, keys)
}

function parseSanctions(value: unknown): MySanction[] {
  let entries: unknown
  if (Array.isArray(value)) entries = value
  else if (isRecord(value)) {
    entries = value.sanctions ?? value.items ?? value.content ?? value.records ?? value.history
  }
  if (!Array.isArray(entries)) {
    throw new Error('제재 내역 응답 형식이 예상과 다릅니다. 백엔드 응답 스키마 확인이 필요합니다.')
  }
  return entries.map((item, index) => {
    if (!isRecord(item)) throw new Error('제재 내역에 올바르지 않은 항목이 있습니다.')
    const rawId = item.id ?? item.sanctionId
    const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : `row-${index}`
    const rawDays = item.durationDays ?? item.days
    return {
      id,
      reason: textField(item, ['reason', 'description', 'sanctionReason']),
      type: textField(item, ['type', 'sanctionType']),
      status: textField(item, ['status', 'sanctionStatus']) ?? (typeof item.active === 'boolean' ? (item.active ? '진행 중' : '종료') : null),
      startedAt: dateField(item, ['startedAt', 'startAt', 'startDate', 'effectiveAt']),
      endedAt: dateField(item, ['endedAt', 'endAt', 'endDate', 'expiresAt']),
      createdAt: dateField(item, ['createdAt', 'issuedAt', 'appliedAt']),
      days: typeof rawDays === 'number' && Number.isFinite(rawDays) ? rawDays : null,
    }
  })
}

/** 서버 제재 내역만 조회합니다. 로컬 시연 데이터나 가짜 제재 기록은 만들지 않습니다. */
export async function getMySanctions(signal?: AbortSignal): Promise<MySanction[]> {
  const { data: envelope } = await apiClient.get<Envelope>('/api/v1/users/me/sanctions', { signal })
  if (!envelope?.success) {
    throw new Error(envelope?.error?.message || envelope?.error?.reason || '제재 내역을 조회하지 못했습니다.')
  }
  return parseSanctions(envelope.data)
}
