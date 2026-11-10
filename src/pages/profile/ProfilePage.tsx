import { drops, useWallet } from '../../features/missions/wallet'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'

import Character from '../../components/common/Character'
import MySanctionsSection from '../../features/account/MySanctionsSection'
import MyReportsSection from '../../features/account/MyReportsSection'
import './profile-tune.css'
import { useQuery } from '@tanstack/react-query'
import { getMyAdoptions, toMyAdoptionsView } from '../../apis/my-drains'
import { getPauseStatus } from '../../apis/profile-settings'
import type { MyAdoptionDto } from '../../types/myDrains'
import { getErrorMessage, getMe } from '../../apis/auth'
import NicknameChangeDialog from '../../features/nickname/NicknameChangeDialog'

// The server nickname is authoritative; preview names must not override signup.
const NAME_STORAGE_KEY = 'ddorang:demo-profile-name'
const PHOTO_STORAGE_KEY = 'ddorang:demo-profile-photo'

function loadFromStorage(key: string, fallback = '') {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const statusLabel = { normal: '관리 중', overdue: '점검 필요', paused: '점검 쉬는 중' }

function isValidDate(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function getCareStatus(adoption: MyAdoptionDto, now: number, accountPause?: string | null) {
  const pausedUntil = isValidDate(accountPause ?? adoption.pause_until ?? '')
  if (pausedUntil !== null && pausedUntil > now) return 'paused' as const

  const nextInspectionAt = isValidDate(adoption.next_inspection_at)
  if (adoption.release_warning || (nextInspectionAt !== null && nextInspectionAt < now)) {
    return 'overdue' as const
  }

  return 'normal' as const
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wallet = useWallet()
  const [nickname, setNickname] = useState<string | null>(null)
  const [photo, setPhoto] = useState(() => loadFromStorage(PHOTO_STORAGE_KEY))
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getMe().then((me) => {
      if (!active) return
      const serverName = me.nickname?.trim() || '또랑이집사'
      setNickname(serverName)
      // Existing social mock UI also reads this value; do not invent another name.
      saveToStorage(NAME_STORAGE_KEY, serverName)
    }).catch((err: unknown) => {
      if (active) {
        setNickname('')
        setMessage(getErrorMessage(err))
      }
    })
    return () => { active = false }
  }, [])

  // MainLayout's CareWarningGate already observes these account-scoped queries.
  const adoptionQuery = useQuery({
    queryKey: ['my-adoptions', wallet.id],
    queryFn: ({ signal }) => getMyAdoptions(signal),
    enabled: wallet.id !== null,
    select: toMyAdoptionsView,
    staleTime: 30_000,
  })
  const pauseQuery = useQuery({
    queryKey: ['pause-status', wallet.id],
    queryFn: getPauseStatus,
    enabled: wallet.id !== null,
    staleTime: 30_000,
  })
  const adoptions = adoptionQuery.data?.adoptions ?? []
  const listReady = adoptionQuery.isSuccess
  const careReady = listReady && (adoptions.length === 0 || pauseQuery.isSuccess)
  const listMessage = wallet.id === null || adoptionQuery.isError
    ? '입양 정보를 불러오지 못했어요.'
    : '입양 정보를 불러오는 중이에요.'
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const adoptedCount = adoptions.length
  const recentlyCheckedCount = adoptions.filter((adoption) => {
    const lastCareAt = isValidDate(adoption.last_care_at)
    return lastCareAt !== null && lastCareAt <= now && now - lastCareAt <= 14 * 24 * 60 * 60 * 1000
  }).length
  const needsCare = adoptions.filter((adoption) => getCareStatus(adoption, now, pauseQuery.data?.activeUntil) === 'overdue')

  const changePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('이미지 파일을 선택해 주세요.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('사진은 5MB 이하만 사용할 수 있어요.')
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setMessage('사진을 불러오지 못했어요.')
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      const image = new Image()
      image.onerror = () => setMessage('이 사진 형식은 읽을 수 없어요.')
      image.onload = () => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          setMessage('사진을 처리할 수 없어요.')
          return
        }
        canvas.width = 256
        canvas.height = 256
        const length = Math.min(image.width, image.height)
        context.drawImage(
          image,
          (image.width - length) / 2,
          (image.height - length) / 2,
          length,
          length,
          0,
          0,
          256,
          256,
        )
        const resized = canvas.toDataURL('image/jpeg', 0.78)
        setPhoto(resized)
        const saved = saveToStorage(PHOTO_STORAGE_KEY, resized)
        setMessage(saved ? '프로필 사진을 이 브라우저에 저장했어요.' : '사진이 변경됐지만 브라우저에는 저장하지 못했어요.')
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhoto('')
    try {
      window.localStorage.removeItem(PHOTO_STORAGE_KEY)
    } catch {
      // 저장이 차단된 브라우저에서도 현재 화면의 사진은 제거합니다.
    }
    setMessage('기본 프로필 이미지로 변경했어요.')
  }

  return (
    <div className="dd-profile min-h-[calc(100dvh-128px)] space-y-2.5 px-4 py-3">
      {editing && <NicknameChangeDialog currentNickname={nickname ?? ''} onClose={() => setEditing(false)} onChanged={value => { setNickname(value); setEditing(false); saveToStorage(NAME_STORAGE_KEY, value); setMessage('닉네임을 변경했습니다.') }} />}
      <section className="dd-profile-panel">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="프로필 사진 변경"
              className="relative flex size-16 items-center justify-center overflow-hidden rounded-full border-2 border-[#DCECF9] bg-[#EEF8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#338CF0]"
            >
              {photo ? (
                <img src={photo} alt="내 프로필 사진" className="h-full w-full object-cover" />
              ) : (
                <Character type="state" state="happy" size={64} />
              )}
            </button>
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#338CF0] text-white">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h4l2-2h4l2 2h4v12H4z" /><circle cx="12" cy="13" r="3" />
              </svg>
            </span>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={changePhoto} className="sr-only" tabIndex={-1} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-extrabold leading-tight tracking-tight">{nickname === null ? '불러오는 중…' : nickname || '회원'}</h2>
            <div className="flex flex-wrap gap-x-3">
              <button type="button" onClick={() => { setEditing(true); setMessage('') }} className="dd-profile-action">닉네임 수정</button>
              {photo && <button type="button" onClick={removePhoto} className="dd-profile-action">사진 삭제</button>}
            </div>
          </div>
          <Link to="/profile/mypage" state={{ fromProfile: true }} className="dd-profile-action shrink-0">마이페이지 <span aria-hidden="true">›</span></Link>
        </div>
        <div className="dd-profile-wallet">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span>보유한 빗물 <small>(로컬 시연)</small></span>
            <output aria-label="보유한 빗물">{wallet.id === null ? '—' : drops(wallet.balance)}</output>
          </div>
          <Link to="/shop" className="dd-profile-action shrink-0">꾸미기 상점 <span aria-hidden="true">›</span></Link>
        </div>
        {message && <p role="status" className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] leading-5 text-[#3A78A9]">{message}</p>}
      </section>

      <section className="dd-profile-panel">
        <div className="grid grid-cols-2 gap-2">
          <div className="dd-profile-stat">
            <p className="text-xs font-semibold">입양한 또랑이</p>
            <p className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-[var(--dd-blue)]">{listReady ? adoptedCount : '—'}{listReady && <span className="ml-1 text-[12px] font-bold">개</span>}</p>
          </div>
          <div className="dd-profile-stat">
            <p className="text-xs font-semibold">최근 14일 점검</p>
            <p className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-[var(--dd-blue)]">{listReady ? recentlyCheckedCount : '—'}{listReady && <span className="ml-1 text-[12px] font-bold">개</span>}</p>
          </div>
        </div>
        {!careReady ? (
          <p className="dd-profile-note" role="status">{!listReady ? listMessage : pauseQuery.isError ? '점검 상태를 불러오지 못했어요.' : '점검 상태를 확인하고 있어요.'}</p>
        ) : needsCare.length > 0 ? (
          <Link to="/my-drains" className="dd-profile-note flex items-center justify-between gap-2" data-status="overdue">
            <span>점검이 필요한 또랑이가 {needsCare.length}개 있어요.</span><span aria-hidden="true">›</span>
          </Link>
        ) : (
          <p className="dd-profile-note" data-status="normal">{adoptedCount === 0 ? '아직 돌봄 기록이 없어요. 첫 또랑이를 입양해 보세요.' : '현재 점검이 필요한 또랑이는 없어요.'}</p>
        )}
      </section>

      <section className="dd-profile-panel">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">내가 돌보는 또랑이</h3>
          <Link to="/my-drains" className="dd-profile-action">전체 보기 <span aria-hidden="true">›</span></Link>
        </div>
        <div className="mt-1 divide-y divide-[var(--dd-line)]">
          {!listReady ? null : adoptions.length ? adoptions.map((adoption) => {
            const status = getCareStatus(adoption, now, pauseQuery.data?.activeUntil)
            return (
              <Link to={`/drains/${adoption.drain.drain_id}`} key={adoption.adoption_id} className="flex items-center gap-3 py-2">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0F8FF]">
                  <Character type="level" level={adoption.level} size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{adoption.adoption_name}</p>
                  <p className="mt-1 truncate text-[11px] text-[var(--dd-muted)]">Lv.{adoption.level} · {adoption.drain.name}</p>
                </div>
                {careReady && <span data-status={status} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold">
                  {statusLabel[status]}
                </span>}
              </Link>
            )
          }) : <p className="py-2 text-sm text-[var(--dd-muted)]">아직 입양한 또랑이가 없어요.</p>}
        </div>
      </section>

      <MyReportsSection />
      <MySanctionsSection />
    </div>
  )
}
