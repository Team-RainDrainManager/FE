import { queryOptions, useQuery } from '@tanstack/react-query'
import type { ApiEnvelope } from './auth'
import { apiClient } from './axios-instance'

export interface Rank {
  userId: number
  rank: number
  nickname: string
  profileImage?: string | null
  score: number
  isMe: boolean
}

type WeeklyLeaderboard = {
  rankings: Rank[]
  totalParticipants: number | null
}

type WeeklyRank = {
  rank: number | null
  score: number
  periodStart: string | null
}

export function useTopRanks(id: number | null) {
  return useQuery({
    queryKey: ['weekly-leaderboard', id],
    enabled: id !== null,
    queryFn: async ({ signal }) => {
      const { data: body } = await apiClient.get<ApiEnvelope<WeeklyLeaderboard | null>>('/api/v1/leaderboard', {
        params: { type: 'WEEKLY', limit: 10 },
        signal,
      })
      if (!body.success || !Array.isArray(body.data?.rankings)) {
        throw new Error('순위를 불러오지 못했어요.')
      }

      const { rankings, totalParticipants } = body.data
      return {
        rankings,
        totalParticipants: typeof totalParticipants === 'number'
          && Number.isSafeInteger(totalParticipants)
          && totalParticipants >= 0
          ? totalParticipants
          : null,
      }
    },
  })
}

function weeklyRankOptions(id: number | null) {
  return queryOptions({
    queryKey: ['weekly-rank', id],
    enabled: id !== null,
    queryFn: async ({ signal }) => {
      const { data: body } = await apiClient.get<ApiEnvelope<WeeklyRank | null>>('/api/v1/leaderboard/me', {
        params: { type: 'WEEKLY' },
        signal,
      })
      if (!body.success || !body.data || !Number.isFinite(body.data.score)) {
        throw new Error('내 점수를 확인하지 못했어요.')
      }

      const { rank, score, periodStart } = body.data
      return {
        rank: typeof rank === 'number' && Number.isSafeInteger(rank) && rank > 0 ? rank : null,
        score,
        periodStart: typeof periodStart === 'string' ? periodStart : null,
      }
    },
  })
}

export function useMyWeeklyRank(id: number | null) {
  return useQuery(weeklyRankOptions(id))
}

export function useWeeklyScore(id: number | null) {
  return useQuery({
    ...weeklyRankOptions(id),
    select: (result) => result.score,
  })
}
