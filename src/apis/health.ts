import axios from 'axios'
import { apiClient } from './axios-instance'

// 로그인 여부와 상관없이 서버가 살아 있는지만 확인합니다. 토큰을 붙이지 않습니다.
const healthClient = axios.create({
  baseURL: apiClient.defaults.baseURL,
  timeout: 5000,
})

// GET /api/v1/health : 서버가 정상 응답하면 true
export async function isServerHealthy(signal?: AbortSignal): Promise<boolean> {
  try {
    const { data: body } = await healthClient.get<{ success?: boolean }>(
      '/api/v1/health',
      { signal },
    )
    return body?.success === true
  } catch {
    return false
  }
}
