import axios from 'axios'
import { apiClient } from './axios-instance'
import { type ApiEnvelope } from './auth'

export type ActivityType = 'INSPECTION' | 'REPORT' | 'POINT'
export type ActivityFilter = 'ALL' | ActivityType
interface Activity {
  type: ActivityType
  id: number
  title: string
  description: string | null
  occurredAt: string
  amount: number | null
  drainName: string | null
  status: string | null
}
interface ActivityPage {
  activities: Activity[]
  nextCursor: string | null
}

export async function getActivities(type: ActivityFilter, cursor: string | undefined, signal: AbortSignal) {
  const { data } = await apiClient.get<ApiEnvelope<ActivityPage>>('/api/v1/users/me/activities', {
    params: { type, cursor, size: 20 }, signal,
  })
  if (!data.success || !Array.isArray(data.data?.activities)) {
    throw new Error(data.error?.message || '활동 내역을 불러올 수 없습니다.')
  }
  return data.data
}

export async function registerCertificateName(realName: string) {
  const { data } = await apiClient.post<ApiEnvelope<{ realName: string }>>('/api/v1/users/me/identity', { realName })
  if (!data.success || !data.data?.realName) throw new Error(data.error?.message || '실명을 저장하지 못했습니다.')
}

export class CertificateNameRequired extends Error {}

export async function downloadCertificate() {
  let pdf: Blob
  try {
    const response = await apiClient.get<Blob>('/api/v1/users/me/certificate', {
      responseType: 'blob', headers: { Accept: 'application/pdf, application/json' },
    })
    pdf = response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const body = await error.response.data.text()
      const envelope = await new Response(body).json().catch(() => null)
      if (envelope?.error?.code === 'IDENTITY_VERIFICATION_REQUIRED') {
        throw new CertificateNameRequired(envelope.error.message || '실명을 등록해 주세요.', { cause: error })
      }
      if (typeof envelope?.error?.message === 'string') throw new Error(envelope.error.message, { cause: error })
    }
    throw error
  }
  if (await pdf.slice(0, 5).text() !== '%PDF-') throw new Error('활동 확인서 PDF를 확인할 수 없습니다.')
  const url = URL.createObjectURL(pdf)
  const link = document.createElement('a')
  link.href = url
  link.download = '또랑-활동확인서.pdf'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
