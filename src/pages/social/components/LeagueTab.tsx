import { useNavigate } from 'react-router'
import { CURRENT_SOCIAL_USER_ID, MOCK_SOCIAL_USERS, getLeaderboardRows } from '../../../mocks/social'
import RankingList from './RankingList'

const LEAGUES = [
  {name:'나무',emoji:'🌳',minimum:0},
  {name:'돌',emoji:'🪨',minimum:500},
  {name:'브론즈',emoji:'🥉',minimum:1000},
  {name:'실버',emoji:'🥈',minimum:1600},
  {name:'골드',emoji:'🥇',minimum:2400},
  {name:'다이아몬드',emoji:'💎',minimum:3500},
]

export default function LeagueTab() {
  const navigate=useNavigate()
  const rankings=getLeaderboardRows('weekly')
  const me=MOCK_SOCIAL_USERS.find(user=>user.id===CURRENT_SOCIAL_USER_ID)
  const score=me?.totalScore??0
  const activeIndex=Math.max(0,LEAGUES.findLastIndex(league=>score>=league.minimum))
  const active=LEAGUES[activeIndex]
  const next=LEAGUES[activeIndex+1]
  const progress=next?Math.min(100,Math.round(100*(score-active.minimum)/(next.minimum-active.minimum))):100
  return <div className="space-y-5">
    <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
      <div className="flex items-center gap-3"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5F6EA] text-3xl" aria-hidden="true">{active.emoji}</div><div><p className="text-[11px] font-semibold text-[#7F96A8]">내 리그 · 시연 점수 기준</p><h2 className="mt-1 text-xl font-extrabold text-[#203451]">{active.name} 리그</h2><p className="mt-1 text-xs text-[#7F96A8]">누적 {score.toLocaleString('ko-KR')}점</p></div></div>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {LEAGUES.map((league,index)=><div key={league.name} aria-current={index===activeIndex?'step':undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold ${index===activeIndex?'border-[#90D5AA] bg-[#E5F6EA] text-[#2C936B]':'border-[#E9EEF3] bg-[#F8FAFC] text-[#93A0AC]'}`}><span className="text-xl">{league.emoji}</span><span>{league.name}</span></div>)}
      </div>
      {next?<><div className="mt-4 flex justify-between text-xs"><strong>다음 리그: {next.name}</strong><span>{score} / {next.minimum}점</span></div><div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="다음 리그 진행률" className="mt-2 h-2 overflow-hidden rounded-full bg-[#E9F1F6]"><div className="h-full rounded-full bg-[#3981F7]" style={{width:`${progress}%`}}/></div></>:<p className="mt-3 text-xs font-semibold">최상위 리그입니다.</p>}
      <p className="mt-3 text-[11px] leading-5 text-[#78899F]">현재 리그와 점수는 화면 시연용 데이터입니다. 승급 기준 및 실제 서버 순위는 추후 연동이 필요합니다.</p>
    </section>
    <section><div className="mb-3 flex items-center justify-between"><div><h3 className="text-base font-extrabold text-[#203451]">이번 주 순위</h3><p className="mt-1 text-xs text-[#78899F]">이웃 집사들의 참여 점수</p></div><button type="button" onClick={()=>navigate('/social/leaderboard')} className="rounded-xl bg-[#EAF4FF] px-3 py-2 text-xs font-bold text-[#3981F7]">전체 보기 ›</button></div><RankingList rows={rankings}/></section>
  </div>
}
