import { useQuery } from '@tanstack/react-query'
import { apiClient } from './axios-instance'
export interface Rank {
  userId: number
  rank: number
  nickname: string
  score: number
  isMe: boolean
}
export function useTopRanks(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['weekly-rankings', id],
    enabled: enabled && id !== null,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/leaderboard', {
        params: { type: 'WEEKLY', limit: 10 },
        signal,
      })
      if (!data.success || !Array.isArray(data.data?.rankings))
        throw new Error('순위를 불러오지 못했어요.')
      return data.data.rankings as Rank[]
    },
  })
}
export function useWeeklyScore(id: number | null) {
  return useQuery({
    queryKey: ['weekly-score', id],
    enabled: id !== null,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/leaderboard/me', {
        params: { type: 'WEEKLY' },
        signal,
      })
      if (!data.success || !Number.isFinite(data.data?.score))
        throw new Error('내 점수를 확인하지 못했어요.')
      return data.data.score as number
    },
  })
}
