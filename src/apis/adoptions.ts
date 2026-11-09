
import { AI_REQUEST_TIMEOUT_MS, apiClient } from './axios-instance'
import type { DrainDetailDto } from '../types/drainDetail'
import { getMyAdoptions } from './my-drains'

export function getMyAdoptionList() {
  return getMyAdoptions()
}

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === null) {
    throw new Error(
      body.error?.message ?? '요청을 처리하지 못했어요.',
    )
  }

  return body.data
}

// 실제 빗물받이 상세 조회
export async function getAdoptionDrainDetail(
  drainId: number,
  signal?: AbortSignal,
): Promise<DrainDetailDto> {
  const { data: body } = await apiClient.get<
    ApiResponse<DrainDetailDto>
  >(`/api/v1/drain/${drainId}`, { signal })

  const detail = unwrap(body)

  return {
    ...detail,
    photoUrl: detail.photoUrl ?? '',
  }
}

// 사진 업로드 purpose
export type UploadPurpose =
  | 'BEFORE'
  | 'AFTER'
  | 'DRAIN'
  | 'REPORT'

type PresignedResponse = {
  key: string
  uploadUrl: string
  expiresAt: string
  headers: Record<string, string>
}

const MAX_PHOTO_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

// 사진 업로드 후 서버 API에서 사용할 key 반환
export async function uploadAdoptionPhoto(
  file: File,
  purpose: UploadPurpose,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      'JPG, PNG, WEBP 사진만 업로드할 수 있어요.',
    )
  }

  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('사진 크기는 10MB 이하여야 해요.')
  }

  // 1. Presigned URL 발급
  const { data: body } = await apiClient.post<
    ApiResponse<PresignedResponse>
  >('/api/v1/uploads/presigned-url', {
    purpose,
    contentType: file.type,
  })

  const { key, uploadUrl, headers } = unwrap(body)

  if (!key || !uploadUrl) {
    throw new Error(
      '사진 업로드 정보를 받지 못했어요.',
    )
  }

  // 2. S3에 사진 직접 업로드
  // Authorization 헤더를 추가하지 않음
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error(
      `사진 업로드에 실패했어요. (${uploadResponse.status})`,
    )
  }

  // 3. 실제 발급받은 key 반환
  return key
}

// 사용자의 실제 GPS 위치
export function getCurrentCoordinates(): Promise<{
  latitude: number
  longitude: number
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error('위치를 지원하지 않는 브라우저예요.'),
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      },
      (error) => {
        reject(
          new Error(
            error.code === 1
              ? '위치 권한을 허용해 주세요.'
              : '현재 위치를 확인하지 못했어요.',
          ),
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  })
}

export type CleaningStartResponse = {
  cleaningId: number
  grade: number
  dirtLevel: number
  needsReport: boolean
  mustClean: boolean
  blocked: boolean
}

// 입양 전 청소 시작
export async function startAdoptionCleaning(
  drainId: number,
  request: {
    photoKey: string
    latitude: number
    longitude: number
  },
): Promise<CleaningStartResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<CleaningStartResponse>
  >(
    `/api/v1/drains/${drainId}/cleanings`,
    request,
    { timeout: AI_REQUEST_TIMEOUT_MS },
  )

  return unwrap(body)
}

export type CleaningVerifyResponse = {
  cleaningId: number
  beforeGrade: number
  afterGrade: number
  passed: boolean
  attemptNo: number
}

// 청소 후 AI 인증
export async function verifyAdoptionCleaning(
  cleaningId: number,
  request: {
    photoKey: string
    latitude: number
    longitude: number
  },
): Promise<CleaningVerifyResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<CleaningVerifyResponse>
  >(
    `/api/v1/cleanings/${cleaningId}/verify`,
    request,
    { timeout: AI_REQUEST_TIMEOUT_MS },
  )

  return unwrap(body)
}

export type AdoptionRegisterResponse = {
  adoptionId: number
  drainId: number
  nickname: string
  adoptedAt: string
  nextManagementAt: string
}

// 최종 입양 등록
export async function registerAdoption(
  drainId: number,
  request: {
    cleaningId: number
    nickname: string
    safetyAgreed: boolean
  },
): Promise<AdoptionRegisterResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<AdoptionRegisterResponse>
  >(
    `/api/v1/drains/${drainId}/adoptions`,
    request,
  )

  return unwrap(body)
}

// 본인의 입양 해제 - Swagger 요청 본문은 reason만 받음
export type AdoptionReleaseReason = 'MOVED' | 'NO_TIME' | 'OTHER'

export type AdoptionReleaseResponse = {
  adoptionId: number
  releasedAt: string
}

export async function releaseAdoption(
  adoptionId: number,
  reason: AdoptionReleaseReason,
): Promise<AdoptionReleaseResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<AdoptionReleaseResponse>
  >(`/api/v1/adoptions/${adoptionId}/release`, { reason })

  return unwrap(body)
}

// 정기 점검 기록. 비 예보 점검에는 requestId와 별도 type이 필요함.
export type RegularManagementLogRequest = {
  type: 'REGULAR'
  actionType: 'INSPECTION' | 'CLEANING'
  beforePhotoKey: string
  afterPhotoKey?: string
  memo?: string
  latitude: number
  longitude: number
  safetyAgreed: boolean
}

export type ManagementLogResponse = {
  managementLogId: number
  adoptionId: number
  type: string
  actionType: string
  status: string
  reviewStatus: string
  locationMismatch: boolean
  beforeDirtLevel: number | null
  afterDirtLevel: number | null
  managedAt: string | null
  nextManagementAt: string | null
}

export async function createRegularManagementLog(
  adoptionId: number,
  request: RegularManagementLogRequest,
): Promise<ManagementLogResponse> {
  const { data: body } = await apiClient.post<
    ApiResponse<ManagementLogResponse>
  >(`/api/v1/adoptions/${adoptionId}/management-logs`, request)

  return unwrap(body)
}
