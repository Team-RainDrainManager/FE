import { apiClient } from './axios-instance'

/**
 * Account withdrawal. Confirm the route with the BE API specification before
 * running this against a real account. This request is intentionally irreversible.
 *
 * Expected contract: DELETE /api/v1/users/me, authenticated with access token.
 * Accepts 204 No Content or a successful project ApiEnvelope response.
 */
export async function withdrawMyAccount(): Promise<void> {
  const response = await apiClient.delete<unknown>('/api/v1/users/me')

  if (response.status === 204) return

  const data = response.data
  if (data === null || data === undefined || data === '') return
  if (typeof data === 'object' && data !== null && 'success' in data) {
    const envelope = data as { success: unknown; error?: { message?: string } | null }
    if (envelope.success === true) return
    throw new Error(envelope.error?.message || '회원 탈퇴에 실패했습니다.')
  }

  // Do not silently accept an unknown body as proof of account deletion.
  throw new Error('탈퇴 요청의 응답 형식을 확인할 수 없습니다. 서버 API 명세를 확인해 주세요.')
}
