
export type SocialTab = 'league' | 'friends' | 'feed'

export type LeaderboardType =
  | 'weekly'
  | 'total'
  | 'zone'
  | 'organization'

export interface SocialDrain {
  id: number
  name: string
  level: number
}

export interface SocialUser {
  id: number
  nickname: string
  avatar: string
  organization: string | null
  zone: string
  weeklyScore: number
  totalScore: number
  isMe: boolean
  drains: SocialDrain[]
}

export interface RankingRow {
  id: string
  name: string
  avatar: string
  score: number
  subtitle?: string
  isMe?: boolean
}

export type FeedActivityType = 'inspection' | 'growth'

export interface SocialFeedItem {
  id: number
  userId: number
  drainName: string
  type: FeedActivityType
  description: string
  dateLabel: string
  likes: number
}
