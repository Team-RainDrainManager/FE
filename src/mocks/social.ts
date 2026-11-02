
import type {
  LeaderboardType,
  RankingRow,
  SocialFeedItem,
  SocialUser,
} from '../types/social'

export const CURRENT_SOCIAL_USER_ID = 1

export const MOCK_SOCIAL_USERS: SocialUser[] = [
  {
    id: 1,
    nickname: '물길지킴이',
    avatar: '🌱',
    organization: '역곡동 환경동아리',
    zone: '성심교정–역곡역',
    weeklyScore: 185,
    totalScore: 1420,
    isMe: true,
    drains: [
      { id: 4, name: '등굣길 또랑', level: 3 },
      { id: 5, name: '공원 새싹', level: 1 },
    ],
  },
  {
    id: 2,
    nickname: '햇살집사',
    avatar: '☀️',
    organization: '역곡동 환경동아리',
    zone: '성심교정–역곡역',
    weeklyScore: 310,
    totalScore: 2560,
    isMe: false,
    drains: [
      { id: 11, name: '역곡역 앞 또랑', level: 8 },
      { id: 12, name: '초록 골목', level: 5 },
    ],
  },
  {
    id: 3,
    nickname: '초록발걸음',
    avatar: '🍀',
    organization: null,
    zone: '성심교정–역곡역',
    weeklyScore: 245,
    totalScore: 1890,
    isMe: false,
    drains: [{ id: 18, name: '학교 앞 물길', level: 6 }],
  },
  {
    id: 4,
    nickname: '비구름',
    avatar: '🌧️',
    organization: '부천 물길지킴이',
    zone: '성심교정–역곡역',
    weeklyScore: 160,
    totalScore: 1170,
    isMe: false,
    drains: [{ id: 22, name: '동네 쉼터', level: 4 }],
  },
  {
    id: 5,
    nickname: '맑은하루',
    avatar: '🌼',
    organization: '부천 물길지킴이',
    zone: '성심교정–역곡역',
    weeklyScore: 120,
    totalScore: 980,
    isMe: false,
    drains: [],
  },
  {
    id: 6,
    nickname: '또랑친구',
    avatar: '💧',
    organization: null,
    zone: '성심교정–역곡역',
    weeklyScore: 90,
    totalScore: 750,
    isMe: false,
    drains: [{ id: 31, name: '산책길 또랑', level: 2 }],
  },
]

export const MOCK_SOCIAL_FEED: SocialFeedItem[] = [
  {
    id: 101,
    userId: 2,
    drainName: '역곡역 앞 또랑',
    type: 'inspection',
    description: '정기 점검을 완료하고 물길을 깨끗하게 돌봤어요.',
    dateLabel: '오늘',
    likes: 12,
  },
  {
    id: 102,
    userId: 3,
    drainName: '학교 앞 물길',
    type: 'growth',
    description: '또랑이가 Lv.6으로 성장했어요!',
    dateLabel: '어제',
    likes: 8,
  },
  {
    id: 103,
    userId: 1,
    drainName: '등굣길 또랑',
    type: 'inspection',
    description: '정기 점검을 완료했어요.',
    dateLabel: '2일 전',
    likes: 5,
  },
  {
    id: 104,
    userId: 4,
    drainName: '동네 쉼터',
    type: 'inspection',
    description: '막혀 있던 물길을 점검하고 주변을 정리했어요.',
    dateLabel: '3일 전',
    likes: 16,
  },
]

export function getLeaderboardRows(
  type: LeaderboardType,
): RankingRow[] {
  if (type === 'organization') {
    const groups = new Map<
      string,
      { score: number; hasMe: boolean }
    >()

    for (const user of MOCK_SOCIAL_USERS) {
      if (!user.organization) continue

      const existing = groups.get(user.organization) ?? {
        score: 0,
        hasMe: false,
      }

      groups.set(user.organization, {
        score: existing.score + user.totalScore,
        hasMe: existing.hasMe || user.isMe,
      })
    }

    return Array.from(groups.entries())
      .map(([name, group]) => ({
        id: name,
        name,
        avatar: '🏘️',
        score: group.score,
        subtitle: '단체 누적 참여 점수',
        isMe: group.hasMe,
      }))
      .sort((a, b) => b.score - a.score)
  }

  const users =
    type === 'zone'
      ? MOCK_SOCIAL_USERS.filter(
          (user) => user.zone === '성심교정–역곡역',
        )
      : MOCK_SOCIAL_USERS

  return users
    .map((user) => ({
      id: String(user.id),
      name: user.nickname,
      avatar: user.avatar,
      score:
        type === 'weekly'
          ? user.weeklyScore
          : user.totalScore,
      subtitle: user.organization ?? '개인 집사',
      isMe: user.isMe,
    }))
    .sort((a, b) => b.score - a.score)
}
