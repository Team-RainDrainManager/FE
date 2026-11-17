import { useContext, useState } from 'react'
import { useMyWeeklyRank, useTopRanks, type Rank } from '../../apis/leaderboard'
import { AccountId } from '../../features/account/AccountId'

import Sheet from '../../components/common/Sheet'
import './ranking.css'

const numbers = new Intl.NumberFormat('ko-KR')

const avatarColors = [
  'bg-[#e6f1fd] text-[#255d8a]',
  'bg-[#e2f4ec] text-[#236653]',
  'bg-[#eee8f9] text-[#684e9a]',
  'bg-[#f7eddf] text-[#815638]',
  'bg-[#fae8ef] text-[#924563]',
]

const rankColors = [
  'bg-[#fff0c8] text-[#875704]',
  'bg-[#eaf0f7] text-[#425b79]',
  'bg-[#fae9db] text-[#874f2a]',
]



function WeekMetric({ label, value, unit }: {
  label: string
  value: number | null
  unit: string
}) {
  return (
    <div className="min-w-0 border-l border-[#d9e2ee] px-2 text-center [html[data-dd-theme=dark]_&]:border-[#354962]">
      <dt className="text-xs font-semibold text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">{label}</dt>
      <dd className={`mt-0.5 font-extrabold break-words tabular-nums ${unit === '점' ? 'text-[#385fd4] [html[data-dd-theme=dark]_&]:text-[#9bcaff]' : ''}`}>
        {value === null ? (
          <span className="text-[17px] leading-[35px]">순위 미집계</span>
        ) : (
          <>
            <span className="text-[24px] leading-7 tracking-[-0.04em]">{numbers.format(value)}</span>
            <span className="ml-0.5 text-[13px]">{unit}</span>
          </>
        )}
      </dd>
    </div>
  )
}

function RankingNotice({ message, onRetry }: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="px-1 py-3">
      <p role="status" className="text-[13px] leading-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-11 rounded-xl bg-[#edf5ff] px-3 text-xs font-bold text-[#1b5aa9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6099e8]"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

function RankingRow({ entry }: { entry: Rank }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const photo = entry.profileImage
  const avatarColor = avatarColors[entry.userId % avatarColors.length]
  const rankColor = rankColors[entry.rank - 1] ?? 'text-[#5a728e] [html[data-dd-theme=dark]_&]:text-[#b4c7de]'

  return (
    <li className="rank-row" data-me={entry.isMe}>
      <span className={'grid size-7 place-items-center rounded-[9px] text-[13px] font-extrabold tabular-nums ' + rankColor}>
        {entry.rank}
      </span>
      <span
        aria-hidden="true"
        className={'grid size-8 place-items-center overflow-hidden rounded-xl text-sm font-extrabold ' + avatarColor}
      >
        {photo && photo !== failedPhoto ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={() => setFailedPhoto(photo)}
          />
        ) : (
          Array.from(entry.nickname)[0] ?? '또'
        )}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-bold">{entry.nickname}</span>
        {entry.isMe && (
          <span className="shrink-0 text-[11px] font-extrabold text-[#1a5fbf] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">
            나
          </span>
        )}
      </span>
      <span className="text-right text-sm font-extrabold whitespace-nowrap text-[#274966] tabular-nums [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
        {numbers.format(entry.score)}
        <small className="ml-0.5 text-[11px] font-semibold text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">점</small>
      </span>
    </li>
  )
}

export default function SocialPage() {
  const accountId = useContext(AccountId)
  const weekly = useMyWeeklyRank(accountId)
  const leaderboard = useTopRanks(accountId)
  const [showAll, setShowAll] = useState(false)

  const rankings = leaderboard.data?.rankings ?? []
  const myIndex = rankings.findIndex(entry => entry.isMe)
  const start = Math.max(0, Math.min(myIndex - 2, rankings.length - 5))
  const summary = rankings.slice(start, start + 5)
  const total = leaderboard.data?.totalParticipants
  const rankingDescription = total != null && total > rankings.length
    ? `이번 주 참여 점수 기준 상위 ${rankings.length}명`
    : '이번 주 참여 점수 기준'

  function renderList(entries: Rank[], label: string) {
    return leaderboard.data ? (
      entries.length ? (
        <ol role="list" aria-label={label}>
          {entries.map(entry => <RankingRow key={entry.userId} entry={entry} />)}
        </ol>
      ) : (
        <RankingNotice message="이번 주에 집계된 순위가 없어요." />
      )
    ) : accountId === null ? (
      <RankingNotice message="계정 정보를 확인하지 못했어요." />
    ) : leaderboard.isError ? (
      <RankingNotice message="주간 순위를 불러오지 못했어요." onRetry={() => void leaderboard.refetch()} />
    ) : (
      <RankingNotice message="주간 순위를 불러오는 중이에요." />
    )
  }

  return (
    <div className="rank-page">
      <section
        aria-labelledby="social-weekly-title"
        aria-busy={weekly.isFetching}
        className="rank-card rank-week"
      >
        <h2 id="social-weekly-title" className="text-center text-base font-extrabold tracking-tight">내 주간 기록</h2>
        {weekly.data ? (
          <dl className="grid grid-cols-2">
            <WeekMetric label="이번 주 점수" value={weekly.data.score} unit="점" />
            <WeekMetric label="전체 순위" value={weekly.data.rank} unit="위" />
          </dl>
        ) : accountId === null ? (
          <RankingNotice message="계정 정보를 확인하지 못했어요." />
        ) : weekly.isError ? (
          <RankingNotice message="내 주간 기록을 불러오지 못했어요." onRetry={() => void weekly.refetch()} />
        ) : (
          <RankingNotice message="내 주간 기록을 불러오는 중이에요." />
        )}
      </section>

      <section aria-labelledby="social-top-title" aria-busy={leaderboard.isFetching} className="rank-card rank-list">
        <header>
          <div>
            <h2 id="social-top-title">전체 TOP 3</h2>
            <p>이번 주 참여 점수 기준</p>
          </div>
        </header>
        {renderList(rankings.slice(0, 3), '전체 TOP 3')}
      </section>

      <section aria-labelledby="social-summary-title" aria-busy={leaderboard.isFetching} className="rank-card rank-list">
        <header>
          <div>
            <h2 id="social-summary-title">주간 랭킹 요약</h2>
            <p>{myIndex < 0 && rankings.length ? '조회된 상위 순위 기준' : '나를 기준으로 앞뒤 2명까지'}</p>
          </div>
          <button type="button" aria-haspopup="dialog" onClick={() => setShowAll(true)}>
            <span>전체 랭킹 보기</span>
          </button>
        </header>
        {renderList(summary, '주간 랭킹 요약')}
      </section>

      {showAll && (
        <Sheet title="전체 랭킹" description={rankingDescription} onClose={() => setShowAll(false)}
          closeLabel="전체 랭킹 닫기" className="rank-overlay">
          {renderList(rankings, '전체 랭킹')}
        </Sheet>
      )}

    </div>
  )
}
