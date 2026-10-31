
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { getLeaderboardRows } from '../../mocks/social'
import type { LeaderboardType } from '../../types/social'

import RankingList from './components/RankingList'

const LEADERBOARD_TABS: {
  value: LeaderboardType
  label: string
}[] = [
  { value: 'weekly', label: '주간' },
  { value: 'total', label: '누적' },
  { value: 'zone', label: '구역별' },
  { value: 'organization', label: '단체별' },
]

export default function LeaderboardPage() {
  const navigate = useNavigate()

  const [type, setType] = useState<LeaderboardType>('weekly')

  const rankings = getLeaderboardRows(type)

  return (
    <div className="min-h-[calc(100dvh-128px)] bg-[#F4F7FC] px-4 pb-6 pt-4">
      <button
        type="button"
        onClick={() => navigate('/social')}
        className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#66849B]"
      >
        <span aria-hidden="true">‹</span>
        소셜로 돌아가기
      </button>

      <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
        <p className="text-[11px] font-semibold text-[#78899F]">함께 만드는 맑은 물길</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#203451]">우리 동네 리더보드</h2>
        <p className="mt-2 text-xs leading-5 text-[#78899F]">이웃 집사들의 작은 돌봄을 만나보세요.</p>
      </section>

      {/* 리더보드 탭 */}
      <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-2xl bg-[#EAF1F7] p-1">
        {LEADERBOARD_TABS.map((tab) => {
          const active = type === tab.value

          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => setType(tab.value)}
              className={`
                min-w-0 whitespace-nowrap rounded-xl
                px-1 py-3 text-xs font-bold
                transition-colors
                ${
                  active
                    ? 'bg-white text-[#3981F7] shadow-sm'
                    : 'text-[#8397A8]'
                }
              `}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 순위 정보 */}
      <div className="mb-4 mt-6">
        <h3 className="text-base font-extrabold text-[#203451]">
          {type === 'weekly' && '이번 주 리더보드'}
          {type === 'total' && '누적 리더보드'}
          {type === 'zone' && '구역별 리더보드'}
          {type === 'organization' && '단체별 리더보드'}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[#78899F]">
          {type === 'zone'
            ? '성심교정–역곡역 시범 구역의 참여 점수예요.'
            : type === 'organization'
              ? '단체 구성원의 누적 참여 점수를 합산했어요.'
              : type === 'weekly'
                ? '이번 주 참여 점수 순위예요.'
                : '지금까지 모은 참여 점수 순위예요.'}
        </p>
      </div>

      <RankingList rows={rankings} />

      <div className="mt-5 rounded-2xl bg-[#EAF4FF] px-4 py-4">
        <p className="text-xs font-bold text-[#477DA3]">
          순위는 어떻게 정해지나요?
        </p>

        <p className="mt-2 text-[11px] leading-5 text-[#718FA3]">
          점검과 제보 등 승인된 활동으로 얻은 참여 점수를
          기준으로 순위를 정해요. 사용자 참여 점수와
          각 빗물받이의 성장 경험치는 별도로 관리해요.
        </p>

        <p className="mt-2 text-[11px] text-[#91A6B6]">
          미리보기 순위예요.
        </p>
      </div>
    </div>
  )
}
