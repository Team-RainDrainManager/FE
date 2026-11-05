import { apiClient } from './axios-instance'
import type { ApiEnvelope } from './auth'

export type NotificationSettings = {
  notifications: boolean
  nightConsent: boolean
}

export type PauseStatus = {
  canApply: boolean
  activeUntil: string | null
  nextAvailableAt: string | null
  reason: 'ALREADY_ACTIVE' | 'NO_ADOPTION' | 'COOLDOWN' | null
}

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope?.success) {
    throw new Error(envelope?.error?.message || envelope?.error?.reason || '서버 요청을 처리하지 못했습니다.')
  }
  if (envelope.data === null || envelope.data === undefined) {
    throw new Error('서버 응답에 필요한 정보가 없습니다.')
  }
  return envelope.data
}

function requireNotificationSettings(value: NotificationSettings): NotificationSettings {
  if (typeof value?.notifications !== 'boolean' || typeof value?.nightConsent !== 'boolean') {
    throw new Error('서버 알림 설정 응답 형식이 올바르지 않습니다.')
  }
  return value
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<ApiEnvelope<NotificationSettings>>('/api/v1/users/me/settings')
  return requireNotificationSettings(unwrap(response.data))
}

export async function updateNotificationSettings(
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const response = await apiClient.patch<ApiEnvelope<NotificationSettings>>('/api/v1/users/me/settings', patch)
  return requireNotificationSettings(unwrap(response.data))
}

export async function getPauseStatus(): Promise<PauseStatus> {
  const response = await apiClient.get<ApiEnvelope<PauseStatus>>('/api/v1/users/me/pause')
  const value = unwrap(response.data)
  if (typeof value?.canApply !== 'boolean') {
    throw new Error('서버 점검 쉬기 응답 형식이 올바르지 않습니다.')
  }
  return value
}

/** 실제 서버에 점검 쉬기를 신청합니다. UI의 최종 확인 후에만 호출해야 합니다. */
export async function requestPause(): Promise<void> {
  const response = await apiClient.post<ApiEnvelope<{ pauseUntil: string }>>('/api/v1/users/me/pause')
  const result = unwrap(response.data)
  if (typeof result?.pauseUntil !== 'string') {
    throw new Error('점검 쉬기 응답 형식을 확인할 수 없습니다. 서버에서 현재 상태를 확인해 주세요.')
  }
}
