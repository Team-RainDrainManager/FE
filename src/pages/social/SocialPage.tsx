
import { useState } from 'react'

import Character from '../../components/common/Character'
import type { SocialTab } from '../../types/social'

import LeagueTab from './components/LeagueTab'
import FriendsTab from './components/FriendsTab'
import FeedTab from './components/FeedTab'

const SOCIAL_TABS: { value: SocialTab; label: string }[] = [
  { value: 'league', label: '리그' },
  { value: 'friends', label: '친구' },
  { value: 'feed', label: '피드' },
]

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<SocialTab>('league')

  return (
    <div className="min-h-[calc(100dvh-128px)] bg-[#F4F7FC] px-4 pb-6 pt-4">
      {/* 소셜 배너 */}
      <section className="relative flex min-h-[110px] items-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#E8F5FF] via-[#E9F9F4] to-[#DDF3EC] px-4 py-3">
        <div className="relative z-10 max-w-[68%]">
          <p className="text-[11px] font-bold text-[#6BA6BB]">
            우리 동네의 작은 변화
          </p>

          <h2 className="mt-2 text-lg font-bold leading-6 text-[#203451]">
            함께 만드는
            <br />
            맑은 물길
          </h2>

          <p className="mt-2 text-xs text-[#718F9D]">
            서로의 작은 돌봄을 응원해요.
          </p>
        </div>

        <div className="absolute bottom-1 right-3">
          <Character
            type="level"
            level={3}
            size={88}
            className="drop-shadow-sm"
          />
        </div>

        <div className="absolute -right-8 -top-9 h-32 w-32 rounded-full bg-white/35" />
      </section>

      {/* 리그 / 친구 / 피드 탭 */}
      <div
        role="tablist"
        aria-label="소셜 메뉴"
        className="mt-4 grid grid-cols-3 rounded-2xl bg-[#EAF1F7] p-1"
      >
        {SOCIAL_TABS.map((tab) => {
          const active = activeTab === tab.value

          return (
            <button
              key={tab.value}
              id={`social-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`social-panel-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`
                rounded-xl py-3 text-sm font-bold
                transition-colors
                ${
                  active
                    ? 'bg-white text-[#3981F7] shadow-sm'
                    : 'text-[#8298A8]'
                }
              `}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 탭별 화면 */}
      <div
        id={`social-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`social-tab-${activeTab}`}
        className="mt-5"
      >
        {activeTab === 'league' && <LeagueTab />}
        {activeTab === 'friends' && <FriendsTab />}
        {activeTab === 'feed' && <FeedTab />}
      </div>
    </div>
  )
}
