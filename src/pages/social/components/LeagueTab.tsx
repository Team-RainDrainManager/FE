
import { useNavigate } from 'react-router'

import { getLeaderboardRows } from '../../../mocks/social'
import RankingList from './RankingList'

const LEAGUES = [
  { name: '나무', emoji: '🌳' },
  { name: '돌', emoji: '🪨' },
  { name: '브론즈', emoji: '🥉' },
  { name: '실버', emoji: '🥈' },
  { name: '골드', emoji: '🥇' },
  { name: '다이아몬드', emoji: '💎' },
]

export default function LeagueTab() {
  const navigate = useNavigate()
  const rankings = getLeaderboardRows('weekly')

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5F6EA] text-3xl">
            🌳
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#7F96A8]">
              현재 리그
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#203451]">
              나무 리그
            </h2>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {LEAGUES.map((league, index) => (
            <div
              key={league.name}
              className={`
                flex min-w-0 items-center justify-center
                gap-1 rounded-xl border px-1 py-2
                text-[10px] font-semibold
                ${
                  index === 0
                    ? 'border-[#90D5AA] bg-[#E5F6EA] text-[#2C936B]'
                    : 'border-[#E9EEF3] bg-[#F8FAFC] text-[#93A0AC]'
                }
              `}
            >
              <span>{league.emoji}</span>
              <span>{league.name}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] leading-5 text-[#78899F]">
          리그 미리보기 · 승급 기준은 추후 안내해 드려요.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#203451]">
              이번 주 순위
            </h3>
            <p className="mt-1 text-xs text-[#78899F]">
              이웃 집사들의 참여 점수
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/social/leaderboard')}
            className="rounded-xl bg-[#EAF4FF] px-3 py-2 text-xs font-bold text-[#3981F7]"
          >
            전체 보기 ›
          </button>
        </div>

        <RankingList rows={rankings} />

        <p className="mt-3 px-1 text-[11px] leading-5 text-[#78899F]">
          참여 점수는 사용자 순위용이며, 또랑이의 성장
          경험치와는 별도로 표시됩니다.
        </p>
      </section>
    </div>
  )
}
