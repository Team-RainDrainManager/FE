import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

import {
  CURRENT_SOCIAL_USER_ID,
  MOCK_SOCIAL_FEED,
  MOCK_SOCIAL_USERS,
} from '../../mocks/social'
import type { SocialUser } from '../../types/social'
import FriendInviteDialog from './components/FriendInviteDialog'
import './social-home.css'

type View = 'feed' | 'add' | 'list'
type LeagueView = 'mine' | 'top'

const FRIENDS_KEY = 'ddorang:demo-friends'
const LIKES_KEY = 'ddorang:demo-feed-likes'
const PENDING_KEY = 'ddorang:demo-friend-requests-outgoing'
const INCOMING_KEY = 'ddorang:demo-friend-requests-incoming'
const LEAGUE_ART = ['🌳', '🪨', '⚙️', '🥉', '🥈', '🥇', '💠', '💎'] as const
const LEAGUE_LABELS = ['나무', '돌', '철', '청동', '은', '금', '백금', '다이아'] as const

const LEAGUE_STEPS = [
  { name: 'WOOD', min: 0 },
  { name: 'STONE', min: 150 },
  { name: 'IRON', min: 300 },
  { name: 'BRONZE', min: 450 },
  { name: 'SILVER', min: 600 },
  { name: 'GOLD', min: 750 },
  { name: 'PLATINUM', min: 900 },
  { name: 'DIAMOND', min: 1050 },
] as const

// 시연용 전체 순위 추가 참가자. 실제 서버 순위와 무관합니다.
const DEMO_TOP_EXTRA = [
  { id: 'demo-extra-1', nickname: '빗방울수집가', avatar: '💧', weeklyScore: 1110 },
  { id: 'demo-extra-2', nickname: '맑은골목', avatar: '🌿', weeklyScore: 970 },
  { id: 'demo-extra-3', nickname: '물길산책', avatar: '☀️', weeklyScore: 825 },
  { id: 'demo-extra-4', nickname: '초록하루', avatar: '🍃', weeklyScore: 675 },
]

function readIds(key: string, fallback: number[]): number[] {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored === null) return fallback
    const value: unknown = JSON.parse(stored)
    return Array.isArray(value)
      ? value.filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
      : fallback
  } catch {
    return fallback
  }
}

function saveIds(key: string, ids: number[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // 스토리지가 제한돼도 현재 화면에서는 정상적으로 동작합니다.
  }
}

function ownNickname(): string {
  try {
    const name = window.localStorage.getItem('ddorang:demo-profile-name')?.trim()
    if (name) return name
  } catch {
    // 브라우저 스토리지 접근이 제한된 경우 기본 닉네임 사용
  }
  return MOCK_SOCIAL_USERS.find(user => user.id === CURRENT_SOCIAL_USER_ID)?.nickname ?? '나'
}

function leagueIndex(score: number) {
  for (let i = LEAGUE_STEPS.length - 1; i >= 0; i--) {
    if (score >= LEAGUE_STEPS[i].min) return i
  }
  return 0
}

function TrophyIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5m-4 2h8m-6-2h4" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.6 5.6 0 0 0-7.9 0l-.9.9-.9-.9a5.6 5.6 0 1 0-7.9 7.9L12 21l8.8-8.5a5.6 5.6 0 0 0 0-7.9Z" />
    </svg>
  )
}

function LeaguePanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<LeagueView>('mine')
  const sheetRef = useRef<HTMLElement | null>(null)
  const sheetDragRef = useRef<{ pointerId: number; startY: number; moved: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollDragRef = useRef<{ pointerId: number; startY: number; scrollTop: number } | null>(null)

  const me = MOCK_SOCIAL_USERS.find(user => user.id === CURRENT_SOCIAL_USER_ID)
  const myScore = me?.weeklyScore ?? 0
  const currentLeague = leagueIndex(myScore)
  const members = MOCK_SOCIAL_USERS
    .filter(user => leagueIndex(user.weeklyScore) === currentLeague)
    .sort((a, b) => b.weeklyScore - a.weeklyScore)
  const movement = members.length >= 3 ? Math.max(1, Math.floor(members.length * 0.25)) : 0
  const ranked = members.map((user, index) => ({ user, rank: index + 1 }))
  const zones = [
    { kind: 'up', title: '↗ 승급 예정', rows: ranked.slice(0, movement) },
    { kind: 'hold', title: '유지 예정', rows: ranked.slice(movement, members.length - movement) },
    { kind: 'down', title: '↙ 하락 예정', rows: ranked.slice(members.length - movement) },
  ].filter(zone => zone.rows.length > 0)
  const topTen = [
    ...MOCK_SOCIAL_USERS.map(user => ({
      id: `user-${user.id}`, nickname: user.nickname,
      avatar: user.avatar, weeklyScore: user.weeklyScore,
      isMe: user.id === CURRENT_SOCIAL_USER_ID,
    })),
    ...DEMO_TOP_EXTRA.map(user => ({ ...user, isMe: false })),
  ].sort((a, b) => b.weeklyScore - a.weeklyScore).slice(0, 10)

  useEffect(() => {
    function onEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  function startSheetDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, moved: 0 }
    sheetRef.current?.classList.add('is-dragging')
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveSheetDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = sheetDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.moved = Math.max(0, event.clientY - drag.startY)
    sheetRef.current?.style.setProperty('--rd-sheet-drag', `${drag.moved}px`)
  }
  function endSheetDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = sheetDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    sheetDragRef.current = null
    sheetRef.current?.classList.remove('is-dragging')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved > 85) onClose()
    else sheetRef.current?.style.setProperty('--rd-sheet-drag', '0px')
  }
  function startScrollDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !scrollRef.current) return
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return
    scrollDragRef.current = { pointerId: event.pointerId, startY: event.clientY, scrollTop: scrollRef.current.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveScrollDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = scrollDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !scrollRef.current) return
    scrollRef.current.scrollTop = drag.scrollTop - (event.clientY - drag.startY)
  }
  function endScrollDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (scrollDragRef.current?.pointerId !== event.pointerId) return
    scrollDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return createPortal(
    <div className="rd-social-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={sheetRef} className="rd-social-league" role="dialog" aria-modal="true" aria-labelledby="rd-league-title">
        <div className="rd-social-league-head" onPointerDown={startSheetDrag} onPointerMove={moveSheetDrag} onPointerUp={endSheetDrag} onPointerCancel={endSheetDrag} aria-label="아래로 끌어 리그 닫기">
          <span className="rd-social-sheet-grab" aria-hidden="true" />
          <div><p className="rd-social-eyebrow">MY DDORANG</p><h2 id="rd-league-title"><TrophyIcon /> 리그</h2></div>
        </div>
        <div ref={scrollRef} className="rd-social-league-body" onPointerDown={startScrollDrag} onPointerMove={moveScrollDrag} onPointerUp={endScrollDrag} onPointerCancel={endScrollDrag}>
          <div className="rd-social-segment" role="tablist" aria-label="리그 순위 보기">
            <button type="button" role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'is-active' : ''} onClick={() => setView('mine')}>내 리그</button>
            <button type="button" role="tab" aria-selected={view === 'top'} className={view === 'top' ? 'is-active' : ''} onClick={() => setView('top')}>전체 TOP 10</button>
          </div>
          {view === 'mine' ? (
            <>
              <div className="rd-social-growth">
                <span>나의 리그 성장</span>
                <div className="rd-social-growth-rail" aria-label="8단계 리그 성장 경로">
                  {LEAGUE_STEPS.map((step, idx) => {
                    const locked = idx > currentLeague
                    return (
                      <span key={step.name} className="rd-social-growth-step">
                        <span title={step.name} aria-label={`${step.name}${locked ? ' 잠김' : idx === currentLeague ? ' 현재 리그' : ' 달성'}`} className={`rd-social-growth-badge${locked ? ' is-locked' : ''}${idx === currentLeague ? ' is-current' : ''}`}>
                          {locked ? '?' : LEAGUE_ART[idx]}
                        </span>
                        {idx < LEAGUE_STEPS.length - 1 && <span className="rd-social-growth-arrow" aria-hidden="true">›</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className={`rd-social-league-summary rd-social-league-summary-${LEAGUE_STEPS[currentLeague].name.toLowerCase()}`}>
                <div className="rd-social-summary-info">
                  <span className="rd-social-summary-kicker">MY LEAGUE · {LEAGUE_LABELS[currentLeague]}</span>
                  <h3>{LEAGUE_STEPS[currentLeague].name}</h3>
                  <span className="rd-social-summary-score">이번 주 {myScore.toLocaleString('ko-KR')}점</span>
                </div>
                <span className="rd-social-league-motif" aria-hidden="true">{LEAGUE_ART[currentLeague]}</span>
                <div className="rd-social-rank-pill">{members.findIndex(u => u.id === CURRENT_SOCIAL_USER_ID) + 1} / {members.length}위</div>
              </div>
              <p className="rd-social-unlock-note">리그를 하나씩 해금할수록 또랑이를 더 다양하게 꾸밀 수 있어요.</p>
              <div className="rd-social-section-title"><div><h3>내 리그 순위</h3><p>이번 주 활동 점수 · 관리 현황</p></div></div>
              <div className="rd-social-rank-zones">
                {zones.map(zone => (
                  <section key={zone.kind} className={`rd-social-rank-zone is-${zone.kind}`} aria-label={zone.title}>
                    <div className="rd-social-zone-label"><strong>{zone.title}</strong></div>
                    <div className="rd-social-rank-list">
                      {zone.rows.map(({ user, rank }) => (
                        <div key={user.id} className={`rd-social-rank-row${user.id === CURRENT_SOCIAL_USER_ID ? ' is-me' : ''}`}>
                          <span className="rd-social-rank-num">{rank}</span><span className="rd-social-avatar">{user.avatar}</span>
                          <div className="rd-social-rank-person"><strong>{user.nickname}{user.id === CURRENT_SOCIAL_USER_ID && <span className="rd-social-me">나</span>}</strong><small>또랑이 {user.drains.length}개 관리{user.drains[0] ? ` · ${user.drains[0].name}` : ''}</small></div>
                          <div className="rd-social-rank-end"><strong>{user.weeklyScore.toLocaleString('ko-KR')}점</strong></div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="rd-social-disclaimer">시연용 리그입니다. 점수 구간과 승급·유지·하락 예정은 실제 운영 기준이 아닙니다.</p>
            </>
          ) : (
            <>
              <div className="rd-social-section-title"><div><h3>전체 상위 10명</h3><p>이번 주 참여 점수 기준</p></div></div>
              <div className="rd-social-rank-list">
                {topTen.map((user, index) => (
                  <div key={user.id} className={`rd-social-rank-row${user.isMe ? ' is-me' : ''}`}>
                    <span className="rd-social-rank-num">{index + 1}</span><span className="rd-social-avatar">{user.avatar}</span>
                    <div className="rd-social-rank-person"><strong>{user.nickname}{user.isMe && <span className="rd-social-me">나</span>}</strong><small>{LEAGUE_STEPS[leagueIndex(user.weeklyScore)].name}</small></div>
                    <div className="rd-social-rank-end"><strong>{user.weeklyScore.toLocaleString('ko-KR')}점</strong></div>
                  </div>
                ))}
              </div>
              <p className="rd-social-disclaimer">시연용 TOP 10입니다. 실제 서버 랭킹 연동 전까지 실제 이용자 순위가 아닙니다.</p>
            </>
          )}
        </div>
      </section>
    </div>, document.body,
  )
}

export default function SocialPage() {
  const [friendIds, setFriendIds] = useState<number[]>(() => readIds(FRIENDS_KEY, []))
  const [likedIds, setLikedIds] = useState<number[]>(() => readIds(LIKES_KEY, []))
  const [pendingIds, setPendingIds] = useState<number[]>(() => readIds(PENDING_KEY, []))
  const [incomingIds, setIncomingIds] = useState<number[]>(() => readIds(INCOMING_KEY, []))
  const [editingFriends, setEditingFriends] = useState(false)
  const [view, setView] = useState<View>(() => readIds(FRIENDS_KEY, []).length ? 'feed' : 'add')
  const [selectedFriend, setSelectedFriend] = useState<SocialUser | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pokedIds, setPokedIds] = useState<number[]>([])
  const [cheeredIds, setCheeredIds] = useState<number[]>([])
  const [leagueOpen, setLeagueOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const nickname = ownNickname()

  const friends = MOCK_SOCIAL_USERS.filter(user => user.id !== CURRENT_SOCIAL_USER_ID && friendIds.includes(user.id))
  const recommendations = MOCK_SOCIAL_USERS.filter(user => user.id !== CURRENT_SOCIAL_USER_ID && !friendIds.includes(user.id) && !pendingIds.includes(user.id) && !incomingIds.includes(user.id))
  const outgoing = MOCK_SOCIAL_USERS.filter(user => pendingIds.includes(user.id))
  const incoming = MOCK_SOCIAL_USERS.filter(user => incomingIds.includes(user.id))
  const friendFeed = MOCK_SOCIAL_FEED.filter(feed => friendIds.includes(feed.userId))
  const effectiveView = friends.length === 0 ? 'add' : view

  useEffect(() => {
    const open = () => setLeagueOpen(true)
    window.addEventListener('ddorang:social-league-open', open)
    return () => window.removeEventListener('ddorang:social-league-open', open)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2300)
    return () => window.clearTimeout(timer)
  }, [notice])

  function requestFriend(user: SocialUser) {
    if (friendIds.includes(user.id) || pendingIds.includes(user.id)) return
    const next = [...pendingIds, user.id]
    setPendingIds(next)
    saveIds(PENDING_KEY, next)
    setNotice(`${user.nickname}님께 친구 요청을 보냈습니다. (시연용 · 실제 알림 미전송)`)
  }

  // 서버 연동 전 테스트를 위한 수락 시연입니다. 실제 상대방이 누르는 동작은 아닙니다.
  function demoAcceptSent(user: SocialUser) {
    const remaining = pendingIds.filter(id => id !== user.id)
    setPendingIds(remaining)
    saveIds(PENDING_KEY, remaining)
    const next = [...new Set([...friendIds, user.id])]
    setFriendIds(next)
    saveIds(FRIENDS_KEY, next)
    setView('feed')
    setNotice(`수락 시연: ${user.nickname}님과 친구가 되었습니다.`)
  }

  function simulateIncoming() {
    const user = recommendations[0]
    if (!user) return
    const next = [...incomingIds, user.id]
    setIncomingIds(next)
    saveIds(INCOMING_KEY, next)
    setNotice(`${user.nickname}님의 친구 요청을 시연으로 받았습니다. (실제 알림 아님)`)
  }

  function answerIncoming(user: SocialUser, accepted: boolean) {
    const nextIncoming = incomingIds.filter(id => id !== user.id)
    setIncomingIds(nextIncoming)
    saveIds(INCOMING_KEY, nextIncoming)
    if (accepted) {
      const nextFriends = [...new Set([...friendIds, user.id])]
      setFriendIds(nextFriends)
      saveIds(FRIENDS_KEY, nextFriends)
      setView('feed')
      setNotice(`${user.nickname}님과 친구가 되었습니다. (시연)`)
    } else setNotice(`${user.nickname}님의 친구 요청을 거절했습니다. (시연)`)
  }

  function cancelRequest(user: SocialUser) {
    const next = pendingIds.filter(id => id !== user.id)
    setPendingIds(next)
    saveIds(PENDING_KEY, next)
    setNotice(`${user.nickname}님께 보낸 요청을 취소했습니다.`)
  }

  function removeFriend(user: SocialUser) {
    const next = friendIds.filter(id => id !== user.id)
    setFriendIds(next)
    saveIds(FRIENDS_KEY, next)
    setSelectedFriend(null)
    setEditingFriends(false)
    setView(next.length ? 'list' : 'add')
    setNotice(`${user.nickname}님을 친구 목록에서 제외했습니다.`)
  }

  function toggleLike(id: number) {
    const wasLiked = likedIds.includes(id)
    const next = wasLiked ? likedIds.filter(value => value !== id) : [...likedIds, id]
    setLikedIds(next)
    saveIds(LIKES_KEY, next)
    setNotice(wasLiked ? '좋아요를 취소했습니다.' : `${nickname}님이 좋아합니다`)
  }

  return (
    <div className="rd-social">
      <div className="rd-social-top">
        {effectiveView !== 'feed' && friends.length > 0 ? (
          <button type="button" className="rd-social-back" onClick={() => setView('feed')} aria-label="친구 피드로 돌아가기">‹ <span>친구 소식</span></button>
        ) : (
          <div><p className="rd-social-eyebrow">FRIENDS</p><h2>친구 소식</h2></div>
        )}
        <button type="button" className="rd-social-count rd-social-league-link" aria-label="리그 열기" onClick={event => {
          const button = event.currentTarget
          button.classList.remove('is-sparkling')
          button.classList.add('is-sparkling')
          setLeagueOpen(true)
          window.setTimeout(() => button.classList.remove('is-sparkling'), 120)
        }}><TrophyIcon /><span>리그</span></button>
      </div>

      {effectiveView === 'feed' && (
        <>
          <div className="rd-social-actions">
            <button type="button" onClick={() => setView('list')}><span aria-hidden="true">☷</span> 친구 {friends.length}명</button>
            <button type="button" className="rd-social-action-primary" onClick={() => setView('add')}><span aria-hidden="true">＋</span> 친구 추가</button>
          </div>
          <div className="rd-social-feed-heading"><h3>새로운 돌봄 소식</h3><p>친구들이 돌보는 물길을 확인해 보세요.</p></div>
          {friendFeed.length ? (
            <div className="rd-social-feed-list">
              {friendFeed.map(feed => {
                const user = MOCK_SOCIAL_USERS.find(item => item.id === feed.userId)
                const liked = likedIds.includes(feed.id)
                return (
                  <article key={feed.id} className="rd-social-post">
                    <div className="rd-social-post-author">
                      <span className="rd-social-avatar">{user?.avatar ?? '🌱'}</span>
                      <div><strong>{user?.nickname ?? '동네 친구'}</strong><small>{feed.dateLabel}</small></div>
                      <span className="rd-social-post-type">{feed.type === 'growth' ? '성장 기록' : '점검 완료'}</span>
                    </div>
                    <div className="rd-social-post-content">
                      <h3>{feed.drainName}</h3>
                      <p>{feed.description}</p>
                    </div>
                    <div className="rd-social-post-footer">
                      <button type="button" aria-label={`${feed.drainName} 좋아요`} aria-pressed={liked} className={liked ? 'is-liked' : ''} onClick={() => toggleLike(feed.id)}><HeartIcon filled={liked} /> <span>좋아요</span></button>
                      <span>{feed.likes + (liked ? 1 : 0)}명 공감</span>
                    </div>
                    {liked && <p className="rd-social-liked-by">{nickname}님이 좋아합니다</p>}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rd-social-empty"><div className="rd-social-empty-icon">♡</div><h3>아직 친구 소식이 없어요</h3><p>친구가 새로운 돌봄 활동을 하면 여기에 표시됩니다.</p><button type="button" onClick={() => setView('add')}>친구 더 찾기</button></div>
          )}
        </>
      )}

      {effectiveView === 'add' && (
        <>
          <div className="rd-social-intro"><h3>{friends.length ? '새 친구 찾기' : '함께할 친구를 찾아보세요'}</h3><p>추천 친구를 추가하거나 초대 링크를 공유할 수 있어요.</p></div>
          <button type="button" className="rd-social-invite" onClick={() => setInviteOpen(true)}><span className="rd-social-invite-icon">↗</span><span><strong>친구 초대하기</strong><small>카카오톡으로 초대 링크 공유</small></span><span aria-hidden="true">›</span></button>
          {incoming.length > 0 && (
            <section className="rd-social-requests">
              <div className="rd-social-feed-heading"><h3>받은 친구 요청</h3><p>수락해야 친구가 연결됩니다. (시연)</p></div>
              <div className="rd-social-user-list">{incoming.map(user => (
                <div key={user.id} className="rd-social-user-row">
                  <span className="rd-social-avatar">{user.avatar}</span>
                  <div><strong>{user.nickname}</strong><small>친구가 되고 싶어 해요</small></div>
                  <div className="rd-social-request-buttons"><button type="button" onClick={() => answerIncoming(user, true)}>수락</button><button type="button" className="is-secondary" onClick={() => answerIncoming(user, false)}>거절</button></div>
                </div>
              ))}</div>
            </section>
          )}
          {outgoing.length > 0 && (
            <section className="rd-social-requests">
              <div className="rd-social-feed-heading"><h3>보낸 친구 요청</h3><p>상대방 수락 대기 중 · 현재 시연 데이터</p></div>
              <div className="rd-social-user-list">{outgoing.map(user => (
                <div key={user.id} className="rd-social-user-row">
                  <span className="rd-social-avatar">{user.avatar}</span>
                  <div><strong>{user.nickname}</strong><small>수락 대기</small></div>
                  <div className="rd-social-request-buttons"><button type="button" onClick={() => demoAcceptSent(user)}>수락 시연</button><button type="button" className="is-secondary" onClick={() => cancelRequest(user)}>취소</button></div>
                </div>
              ))}</div>
            </section>
          )}
          <div className="rd-social-feed-heading"><h3>추천 친구</h3><p>시연용 추천 목록입니다.</p></div>
          {recommendations.length ? (
            <div className="rd-social-user-list">
              {recommendations.map(user => (
                <div className="rd-social-user-row" key={user.id}>
                  <span className="rd-social-avatar">{user.avatar}</span>
                  <div><strong>{user.nickname}</strong><small>또랑이 {user.drains.length}개 돌봄 중</small></div>
                  <button type="button" onClick={() => requestFriend(user)}>＋ 친구 요청</button>
                </div>
              ))}
            </div>
          ) : <div className="rd-social-empty"><h3>추천 친구를 모두 추가했어요.</h3><button type="button" onClick={() => setView('feed')}>친구 소식 보기</button></div>}
          <div className="rd-social-demo-incoming"><button type="button" onClick={simulateIncoming} disabled={recommendations.length === 0}>받은 친구 요청 시연</button><span>실제 푸시 알림은 발송되지 않습니다.</span></div>
          <p className="rd-social-disclaimer">친구 요청·수락·거절은 이 브라우저에서만 동작하는 시연 기능입니다. 실제 계정 간 연결에는 서버 API가 필요합니다.</p>
        </>
      )}

      {effectiveView === 'list' && (
        <>
          <div className="rd-social-list-heading"><div className="rd-social-feed-heading"><h3>친구 목록</h3><p>친구의 관리 현황을 확인할 수 있어요.</p></div><button type="button" aria-pressed={editingFriends} onClick={() => setEditingFriends(current => !current)}>{editingFriends ? '완료' : '편집'}</button></div>
          <div className="rd-social-user-list">
            {friends.map(user => (
              <div className="rd-social-user-row" key={user.id}>
                <span className="rd-social-avatar">{user.avatar}</span>
                <div><strong>{user.nickname}</strong><small>또랑이 {user.drains.length}개 관리 중</small></div>
                {editingFriends ? <button type="button" className="rd-social-friend-delete" aria-label={`${user.nickname} 친구 삭제`} onClick={() => { if (window.confirm(`${user.nickname}님을 친구 목록에서 삭제하시겠습니까?`)) removeFriend(user) }}>×</button> : <button type="button" onClick={() => setSelectedFriend(user)}>현황 보기</button>}
              </div>
            ))}
          </div>
          <button type="button" className="rd-social-wide-add" onClick={() => setView('add')}>＋ 친구 추가하기</button>
        </>
      )}

      {notice && <div className="rd-social-toast" role="status" aria-live="polite">{notice}</div>}
      {inviteOpen && <FriendInviteDialog onClose={() => setInviteOpen(false)} onNotice={setNotice} />}
      {leagueOpen && <LeaguePanel onClose={() => setLeagueOpen(false)} />}
      {selectedFriend && createPortal(
        <div className="rd-social-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedFriend(null) }}>
          <section className="rd-social-friend-dialog" role="dialog" aria-modal="true" aria-labelledby="rd-friend-title">
            <div className="rd-social-dialog-head"><div><h2 id="rd-friend-title">{selectedFriend.nickname}의 관리 현황</h2><p>돌보는 또랑이 {selectedFriend.drains.length}개</p></div><button type="button" aria-label="친구 현황 닫기" onClick={() => setSelectedFriend(null)}>×</button></div>
            <div className="rd-social-managed">
              {selectedFriend.drains.length ? selectedFriend.drains.map(drain => <div key={drain.id}><strong>{drain.name}</strong><span>Lv.{drain.level}</span></div>) : <p>아직 관리 중인 또랑이가 없어요.</p>}
            </div>
            <div className="rd-social-friend-interactions">
              <button type="button" disabled={pokedIds.includes(selectedFriend.id)} onClick={() => {
                setPokedIds(prev => [...prev, selectedFriend.id])
                setNotice('친구 찌르기를 시연했습니다. 실제 알림은 보내지지 않습니다.')
              }}>{pokedIds.includes(selectedFriend.id) ? '찌르기 완료' : '친구 찌르기'}</button>
              <button type="button" disabled={cheeredIds.includes(selectedFriend.id)} onClick={() => {
                setCheeredIds(prev => [...prev, selectedFriend.id])
                setNotice('친구 돌봄을 응원했습니다. 실제 알림은 보내지지 않습니다.')
              }}>{cheeredIds.includes(selectedFriend.id) ? '응원 완료' : '돌봄 응원'}</button>
            </div>
            <button type="button" className="rd-social-remove" onClick={() => removeFriend(selectedFriend)}>친구 해제</button>
          </section>
        </div>, document.body,
      )}
    </div>
  )
}
