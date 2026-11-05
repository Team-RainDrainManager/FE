import { apiClient } from './axios-instance'
import type { ApiEnvelope } from './auth'

/** 백엔드 Swagger: PUT /api/v1/push/tokens (platform: WEB) */
export async function registerPushToken(token: string): Promise<void> {
  const result = await apiClient.put<ApiEnvelope<unknown>>('/api/v1/push/tokens', {
    token,
    platform: 'WEB',
  })
  if (!result.data?.success) {
    throw new Error(result.data?.error?.message || '푸시 기기 등록에 실패했습니다.')
  }
}

/** 백엔드 Swagger: DELETE /api/v1/push/tokens (로그아웃 전에 호출) */
export async function deletePushToken(token: string): Promise<void> {
  const result = await apiClient.delete<ApiEnvelope<unknown>>('/api/v1/push/tokens', {
    data: { token },
  })
  if (!result.data?.success) {
    throw new Error(result.data?.error?.message || '푸시 기기 해제에 실패했습니다.')
  }
}
