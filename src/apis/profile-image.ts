import { apiClient } from './axios-instance'
import { uploadAdoptionPhoto } from './adoptions'
import type { ApiEnvelope } from './auth'

export type ProfileImageResult = {
  id: number
  /** 프로필 사진 조회 URL (삭제했으면 null) */
  profileImage: string | null
  updatedAt: string | null
}

// 서버에 보내는 프로필 사진 크기 (정사각형 한 변)
const PROFILE_EDGE = 512

function unwrap(envelope: ApiEnvelope<ProfileImageResult>): ProfileImageResult {
  if (!envelope?.success || !envelope.data) {
    throw new Error(envelope?.error?.message || '프로필 사진을 처리하지 못했어요.')
  }
  return envelope.data
}

/** 고른 사진을 가운데 기준 정사각형으로 잘라 JPEG 파일로 만듭니다. */
async function toSquareJpeg(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('이 사진 형식은 읽을 수 없어요.')
  }
  try {
    const length = Math.min(bitmap.width, bitmap.height)
    const edge = Math.min(PROFILE_EDGE, length)
    const canvas = document.createElement('canvas')
    canvas.width = edge
    canvas.height = edge
    const context = canvas.getContext('2d')
    if (!context) throw new Error('사진을 처리할 수 없어요.')
    context.drawImage(bitmap, (bitmap.width - length) / 2, (bitmap.height - length) / 2, length, length, 0, 0, edge, edge)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error('사진을 처리할 수 없어요.')
    return new File([blob], 'profile.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

/**
 * 프로필 사진을 올리고 내 프로필 사진으로 정합니다.
 * POST /api/v1/uploads/presigned-url (purpose=PROFILE) → S3 업로드 → PATCH /api/v1/users/me/profile-image
 */
export async function changeProfileImage(file: File): Promise<ProfileImageResult> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일을 선택해 주세요.')
  const photo = await toSquareJpeg(file)
  const photoKey = await uploadAdoptionPhoto(photo, 'PROFILE')
  const { data } = await apiClient.patch<ApiEnvelope<ProfileImageResult>>('/api/v1/users/me/profile-image', { photoKey })
  return unwrap(data)
}

/** 프로필 사진을 지우고 기본 프로필로 되돌립니다. DELETE /api/v1/users/me/profile-image */
export async function removeProfileImage(): Promise<ProfileImageResult> {
  const { data } = await apiClient.delete<ApiEnvelope<ProfileImageResult>>('/api/v1/users/me/profile-image')
  return unwrap(data)
}
