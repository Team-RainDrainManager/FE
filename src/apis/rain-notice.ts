import { apiClient } from './axios-instance'

type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: { code: string; message?: string } | null
}

// 지도 위 비 예보 배너. 로그인 없이 볼 수 있고 개인 정보는 없습니다.
export type RainNotice = {
  /** RAINING: 지금 비가 오는 중 · FORECAST: 오늘·내일 비 예보 · NONE: 배너 없음 */
  state: 'RAINING' | 'FORECAST' | 'NONE'
  raining: boolean
  observedAt: string | null
  forecast: {
    forecastId: number
    rainDate: string
    rainStartAt: string
    /** 가장 이른 점검 완료 마감 */
    completeDeadlineAt: string | null
    /** 시연용 가상 예보인지 */
    simulated: boolean
  } | null
  help: {
    /** 대신 점검이 필요한 곳 */
    needsHelpCount: number
    inProgressCount: number
    doneCount: number
  } | null
  message: string | null
}

// GET /api/v1/rain-notice
export async function getRainNotice(signal?: AbortSignal): Promise<RainNotice> {
  const { data: body } = await apiClient.get<ApiResponse<RainNotice>>(
    '/api/v1/rain-notice',
    { signal },
  )
  if (!body.success || !body.data || typeof body.data.state !== 'string') {
    throw new Error(body.error?.message ?? '비 예보 정보를 불러오지 못했어요.')
  }
  return body.data
}
