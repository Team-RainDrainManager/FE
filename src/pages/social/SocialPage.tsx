import { useContext, useEffect, useRef, useState } from 'react'
import { useMyWeeklyRank, useTopRanks, type Rank } from '../../apis/leaderboard'
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



function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024)
}

async function copyInviteLink(url: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return
    } catch {
      // 클립보드 권한이 제한된 환경에서는 선택 복사를 시도합니다.
    }
  }

  const previousFocus = document.activeElement
  const field = document.createElement('textarea')
  field.value = url
  field.readOnly = true
  field.style.position = 'fixed'
  field.style.opacity = '0'
  field.style.pointerEvents = 'none'
  document.body.appendChild(field)

  try {
    field.select()
    if (!document.execCommand('copy')) throw new Error('링크 복사 실패')
  } finally {
    field.remove()
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
  }
}

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
    <li
      className={
        'grid min-h-[clamp(40px,5.6dvh,49px)] grid-cols-[29px_36px_minmax(0,1fr)_auto] items-center gap-2.5 border-t px-2 py-1 max-[350px]:gap-1.5 ' +
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
  const fullList = useRef<HTMLDialogElement>(null)
  const inviting = useRef(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2300)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function shareInvite() {
    if (inviting.current) return
    inviting.current = true

    try {
      const url = new URL('/social', window.location.origin).href
      if (isMobileDevice() && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: '또랑 친구 초대',
            text: '또랑에서 함께 물길을 돌봐요!',
            url,
          })
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
        }
      }

      await copyInviteLink(url)
      setNotice('초대 링크가 복사됐어요.')
    } catch {
      setNotice('링크 복사에 실패했어요. 주소창의 링크를 복사해 주세요.')
    } finally {
      inviting.current = false
    }
  }


  const rankings = leaderboard.data?.rankings ?? []
  const myIndex = rankings.findIndex(entry => entry.isMe)
  const start = Math.max(0, Math.min(myIndex - 3, rankings.length - 7))
  const summary = rankings.slice(start, start + 7)
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
    <div className="flex min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] flex-col gap-[clamp(12px,3dvh,28px)] bg-[#f2f5fc] px-4 pt-[clamp(12px,2.5dvh,22px)] pb-4 text-[#193454] [html[data-dd-theme=dark]_&]:bg-[#101c2b] [html[data-dd-theme=dark]_&]:text-[#edf5ff]">
      <form id="ranking-invite" onSubmit={event => {
        event.preventDefault()
        void shareInvite()
      }}>
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3.5 rounded-[21px] border border-[#b7c7ff] bg-[#f5f7ff] px-4 py-3 text-left [html[data-dd-theme=dark]_&]:bg-[#17283e] transition-colors hover:border-[#b6d3f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#246fce] [html[data-dd-theme=dark]_&]:border-[#354962]"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-[15px] bg-[#eaf3ff] text-[#2068cd] [html[data-dd-theme=dark]_&]:bg-[#283f5b] [html[data-dd-theme=dark]_&]:text-[#9bcaff]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="6.5" r="3.5" />
              <path d="M2 21v-1.5a7 7 0 0 1 14 0V21M19 7v7m-3.5-3.5h7" />
            </svg>
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <strong className="text-base font-extrabold tracking-tight">친구 초대하기</strong>
            <small className="text-xs leading-relaxed text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">또랑 링크를 친구에게 보내요.</small>
          </span>
          <svg className="shrink-0 text-[#286dc4] [html[data-dd-theme=dark]_&]:text-[#9bcaff]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </form>

      <section
        aria-labelledby="social-weekly-title"
        aria-busy={weekly.isFetching}
        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center rounded-[18px] border border-[#dfe6f3] bg-white px-3 py-3 [html[data-dd-theme=dark]_&]:border-[#354962] [html[data-dd-theme=dark]_&]:bg-[#101e2d]"
      >
        <h2 id="social-weekly-title" className="text-sm font-extrabold tracking-tight">내 주간 기록</h2>
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

      <section
        aria-labelledby="social-top-title"
        aria-busy={leaderboard.isFetching}
        className="rounded-[18px] border border-[#dfe9f4] bg-white px-2 pt-2 pb-1.5 [html[data-dd-theme=dark]_&]:bg-[#101e2d] [html[data-dd-theme=dark]_&]:border-[#354962]"
      >
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div>
            <h2 id="social-top-title" className="text-lg font-extrabold tracking-tight">주간 랭킹 요약</h2>
            <p className="mt-0.5 text-xs text-[#536e8a] [html[data-dd-theme=dark]_&]:text-[#b4c7de]">
              {rankingDescription}
            </p>
          </div>
          <button type="button" aria-haspopup="dialog" onClick={() => { fullList.current?.showModal(); setShowAll(true) }}
            className="min-h-11 shrink-0 cursor-pointer px-1">
            <span className="rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-bold text-[#365d8d] [html[data-dd-theme=dark]_&]:bg-[#263c56] [html[data-dd-theme=dark]_&]:text-[#b9d9ff]">전체 랭킹 보기</span>
          </button>
        </div>

        {renderList(summary, '주간 랭킹 요약')}
      </section>

      <dialog ref={fullList} onClose={() => setShowAll(false)} aria-labelledby="full-ranking-title"
        className="fixed inset-0 m-auto max-h-[80dvh] w-[min(92%,440px)] overflow-y-auto overscroll-contain rounded-[18px] bg-white px-3 pb-3 text-inherit backdrop:bg-black/50 [html[data-dd-theme=dark]_&]:bg-[#182638]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-inherit py-1">
          <h2 id="full-ranking-title" className="text-lg font-extrabold">전체 랭킹</h2>
          <button type="button" className="min-h-11 min-w-11 text-sm font-bold" onClick={() => fullList.current?.close()}>닫기</button>
        </div>
        <p className="pb-2 text-xs">{rankingDescription}</p>
        {showAll && renderList(rankings, '전체 랭킹')}
      </dialog>

      {notice && (
        <p role="status" className="fixed inset-x-5 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-[420px] rounded-xl bg-[#193454] px-4 py-3 text-center text-[13px] text-white shadow-lg">
          {notice}
        </p>
      )}
    </div>
  )
}
