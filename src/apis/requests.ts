import { apiClient } from './axios-instance'
import type { InspectionRequest } from '../types/notifications'

export interface Coordinates {
  latitude: number
  longitude: number
}

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: { code: string; message?: string } | null
}

function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === null) {
    throw new Error(body.error?.message ?? '요청을 처리하지 못했어요.')
  }
  return body.data
}

// GET /api/v1/requests/me
// 위도/경도는 동시에 전송하거나 둘 다 생략합니다.
export async function getMyRainRequests(
  coordinates?: Coordinates,
  signal?: AbortSignal,
): Promise<InspectionRequest[]> {
  const { data: body } = await apiClient.get<ApiResponse<InspectionRequest[]>>(
    '/api/v1/requests/me',
    { params: coordinates, signal },
  )
  const requests = unwrap(body)
  if (!Array.isArray(requests)) {
    throw new Error('점검 요청 목록 응답 형식이 올바르지 않아요.')
  }
  // 서버에서 진행 중/최근 종료된 요청의 정렬을 담당합니다.
  return requests
}

type ReplyResult = {
  requestId: number
  state: string
  repliedAt: string
}

// POST /api/v1/requests/{requestId}/reply
export async function replyRainRequest(
  requestId: number,
  reply: 'ACCEPT' | 'DECLINE',
): Promise<ReplyResult> {
  const { data: body } = await apiClient.post<ApiResponse<ReplyResult>>(
    `/api/v1/requests/${requestId}/reply`,
    { reply },
  )
  return unwrap(body)
}

type ClaimResult = {
  requestId: number
  state: string
  claimedAt: string
  completeDeadlineAt: string
}

// POST /api/v1/requests/{requestId}/claim
// 서버에서 거리, 일일 3건 제한, 중복 수락을 검증합니다.
export async function claimRainRequest(
  requestId: number,
  coordinates: Coordinates,
): Promise<ClaimResult> {
  const { data: body } = await apiClient.post<ApiResponse<ClaimResult>>(
    `/api/v1/requests/${requestId}/claim`,
    coordinates,
  )
  return unwrap(body)
}
