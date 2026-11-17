import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMyWeeklyRank, useTopRanks, WEEKLY_RANKING_LIMIT, type Rank } from '../../apis/leaderboard'
import { getMe } from '../../apis/auth'
import happyCharacter from '../../assets/characters/states/happy.svg'
import { AccountId } from '../../features/account/AccountId'

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
    <div className="min-w-0 first:pr-3 last:pl-4">
      <dt className="text-xs font-semibold text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">{label}</dt>
      <dd className={`mt-0.5 font-extrabold break-words tabular-nums ${unit === '점' ? 'text-[#385fd4] [html[data-dd-theme=dark]_&]:text-[#9bcaff]' : ''}`}>
        {value === null ? (
          <span className="text-[17px] leading-[35px]">순위 미집계</span>
        ) : (
          <>
            <span className="text-[27px] leading-[35px] tracking-[-0.04em]">{numbers.format(value)}</span>
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
    <li
      className={
        'grid min-h-[58px] grid-cols-[29px_36px_minmax(0,1fr)_auto] items-center gap-2.5 border-t px-2 py-1.5 max-[350px]:gap-1.5 ' +
        (entry.isMe
          ? 'rounded-xl border-transparent bg-[#edf5ff] [html[data-dd-theme=dark]_&]:bg-[#263c56]'
          : 'border-[#edf2f8] [html[data-dd-theme=dark]_&]:border-[#31465e]')
      }
    >
      <span className={'grid size-7 place-items-center rounded-[9px] text-[13px] font-extrabold tabular-nums ' + rankColor}>
        {entry.rank}
      </span>
      <span
        aria-hidden="true"
        className={'grid size-9 place-items-center overflow-hidden rounded-xl text-sm font-extrabold ' + avatarColor}
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
  // 내 프로필 사진 (프로필 · 마이페이지와 같은 조회를 함께 씁니다)
  const me = useQuery({ queryKey: ['mypage', 'me', accountId], queryFn: getMe, enabled: accountId !== null, staleTime: 30_000 })
  const myPhoto = me.data?.profileImage ?? null
  const [failedMyPhoto, setFailedMyPhoto] = useState<string | null>(null)
  const totalParticipants = leaderboard.data?.totalParticipants
  const rankingTitle = totalParticipants != null && totalParticipants <= WEEKLY_RANKING_LIMIT
    ? '주간 전체 순위'
    : '주간 순위'

  return (
    <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] space-y-4 bg-[#f2f5fc] px-4 pt-[17px] pb-8 text-[#193454] [html[data-dd-theme=dark]_&]:bg-[#101c2b] [html[data-dd-theme=dark]_&]:bg-none [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
      <section
        aria-labelledby="social-weekly-title"
        aria-busy={weekly.isFetching}
        className="rounded-3xl bg-white px-4 py-2.5 [html[data-dd-theme=dark]_&]:bg-[#182638]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_100px] items-end gap-x-1 gap-y-1">
          <div className="min-w-0">
            <h2 id="social-weekly-title" className="text-base font-extrabold tracking-tight">내 주간 기록</h2>
            
          </div>
          {weekly.data ? (
            <dl className="grid grid-cols-2 divide-x divide-[#e0e7f3] [html[data-dd-theme=dark]_&]:divide-[#354962]">
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
          <div className="col-start-2 row-start-1 row-span-2 place-self-center">
            {myPhoto && myPhoto !== failedMyPhoto ? (
              <img
  src={myPhoto}
  alt=""
  width={100}
  height={100}
  draggable={false}
  onError={() => setFailedMyPhoto(myPhoto)}
  className="size-[100px] rounded-lg object-cover"
/>
            ) : (
              <img src={happyCharacter} alt="" width={104} height={104} draggable={false} className="size-24 object-contain min-[380px]:size-[104px]" />
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="social-top-title"
        aria-busy={leaderboard.isFetching}
        className="rounded-3xl bg-white px-3.5 pt-[18px] pb-2.5 [html[data-dd-theme=dark]_&]:bg-[#182638]"      >
        <div className="flex items-center justify-between gap-2.5 px-1.5 pb-3">
          <div>
            <h2 id="social-top-title" className="text-xl font-extrabold tracking-tight">{rankingTitle}</h2>
            <p className="mt-0.5 text-xs text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">
              {totalParticipants != null && totalParticipants > WEEKLY_RANKING_LIMIT
                ? `이번 주 참여 점수 기준 상위 ${WEEKLY_RANKING_LIMIT}명`
                : '이번 주 참여 점수 기준'}
            </p>
          </div>
          {totalParticipants != null && (
            <span className="shrink-0 rounded-[9px] bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#365d8d] [html[data-dd-theme=dark]_&]:bg-[#283f5b] [html[data-dd-theme=dark]_&]:text-[#b9d9ff]">
              집계 {numbers.format(totalParticipants)}명
            </span>
          )}
        </div>

        {leaderboard.data ? (
          leaderboard.data.rankings.length ? (
            <ol role="list" aria-labelledby="social-top-title">
              {leaderboard.data.rankings.map(entry => <RankingRow key={entry.userId} entry={entry} />)}
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
        )}
      </section>

    </div>
  )
}
