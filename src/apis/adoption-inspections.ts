
import { apiClient } from './axios-instance'

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message?: string
  } | null
}

export type AdoptionInspection = {
  inspectionId: number
  kind: string
  createdAt: string
  review: string
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
  beforeGrade: number | null
  afterGrade: number | null
  cleaned: boolean
  xp: number
  photoDeleted: boolean
}

export type AdoptionInspectionPage = {
  nextCursor: number | null
  inspections: AdoptionInspection[]
}

// 입양별 점검 이력 조회
export async function getAdoptionInspections(
  adoptionId: number,
  cursor: number | null = null,
  size = 10,
  signal?: AbortSignal,
): Promise<AdoptionInspectionPage> {
  const { data: body } = await apiClient.get<
    ApiResponse<AdoptionInspectionPage>
  >(
    `/api/v1/adoptions/${adoptionId}/inspections`,
    {
      params: {
        size,
        ...(cursor !== null ? { cursor } : {}),
      },
      signal,
    },
  )

  if (
    !body.success ||
    !body.data ||
    !Array.isArray(body.data.inspections)
  ) {
    throw new Error(
      body.error?.message ??
        '점검 이력을 불러오지 못했어요.',
    )
  }

  return {
    inspections: body.data.inspections,
    nextCursor: body.data.nextCursor ?? null,
  }
}
