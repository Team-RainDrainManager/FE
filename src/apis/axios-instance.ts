
import axios from 'axios'

// 서버가 요청 안에서 AI 판정까지 하는 API는 기본 10초로는 모자랄 수 있습니다.
export const AI_REQUEST_TIMEOUT_MS = 60_000

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.rainbutler.site',
  timeout: 10000,
})
