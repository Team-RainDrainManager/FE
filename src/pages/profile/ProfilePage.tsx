import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'

import Character from '../../components/common/Character'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import type { MyAdoptionDto } from '../../types/myDrains'
import { changeNickname, getErrorMessage, getMe } from '../../apis/auth'

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

const statusStyle = {
  normal: { label: '관리 중', classes: 'bg-[#E8F7EE] text-[#258962]' },
  overdue: { label: '점검 필요', classes: 'bg-[#FFF5DF] text-[#B17A18]' },
  paused: { label: '점검 쉬는 중', classes: 'bg-[#EAF2FF] text-[#3878BF]' },
} as const

function isValidDate(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function getCareStatus(adoption: MyAdoptionDto, now: number) {
  const pausedUntil = adoption.pause_until ? isValidDate(adoption.pause_until) : null
  if (pausedUntil !== null && pausedUntil > now) return 'paused' as const

  const nextInspectionAt = isValidDate(adoption.next_inspection_at)
  if (adoption.release_warning || (nextInspectionAt !== null && nextInspectionAt < now)) {
    return 'overdue' as const
  }

  return 'normal' as const
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nickname, setNickname] = useState(() => loadFromStorage(NAME_STORAGE_KEY, '또랑이 집사'))
  const [photo, setPhoto] = useState(() => loadFromStorage(PHOTO_STORAGE_KEY))
  const [editing, setEditing] = useState(false)
  const [draftNickname, setDraftNickname] = useState(nickname)
  const [message, setMessage] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  useEffect(() => {
    let active = true
    getMe().then((me) => {
      if (!active) return
      setNickname(me.nickname)
      setDraftNickname(me.nickname)
    }).catch((err: unknown) => { if (active) setMessage(getErrorMessage(err)) })
    return () => { active = false }
  }, [])

  const adoptions = useMyDrainsStore((state) => state.data.adoptions)
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
  const needsCare = adoptions.filter((adoption) => getCareStatus(adoption, now) === 'overdue')

  const saveNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = draftNickname.trim()
    if (trimmed.length < 2 || trimmed.length > 20) {
      setMessage('닉네임은 2~20자로 입력해 주세요.')
      return
    }
    setSavingNickname(true)
    try {
      await changeNickname(trimmed)
      setNickname(trimmed)
      setEditing(false)
      saveToStorage(NAME_STORAGE_KEY, trimmed)
      setMessage('서버에 닉네임을 저장했어요.')
    } catch (error: unknown) { setMessage(getErrorMessage(error)) }
    finally { setSavingNickname(false) }
  }

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
    <div className="min-h-[calc(100dvh-128px)] space-y-4 bg-[#F7FAFE] px-[18px] pb-8 pt-5 text-[#24496B]">
      <section className="rounded-[24px] bg-[#EAF5FF] px-5 pb-5 pt-6">
        <p className="text-[11px] font-bold tracking-[0.09em] text-[#338CF0]">MY DDORANG</p>
        <h2 className="mt-1 text-[21px] font-extrabold tracking-[-0.04em]">오늘도 우리 동네를 돌보는 중</h2>
        <p className="mt-1 text-[12px] text-[#7C94AD]">나의 작은 활동이 동네를 더 안전하게 만들어요.</p>

        <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-white p-4">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="프로필 사진 변경"
              className="relative flex size-[78px] items-center justify-center overflow-hidden rounded-full border-2 border-[#DCECF9] bg-[#EEF8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#338CF0]"
            >
              {photo ? (
                <img src={photo} alt="내 프로필 사진" className="h-full w-full object-cover" />
              ) : (
                <Character type="state" state="happy" size={67} />
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
            {editing ? (
              <form onSubmit={saveNickname} className="space-y-2">
                <label htmlFor="nickname" className="text-[11px] font-semibold text-[#6387A8]">닉네임 변경</label>
                <input
                  id="nickname"
                  autoFocus
                  maxLength={20}
                  value={draftNickname}
                  onChange={(event) => setDraftNickname(event.target.value)}
                  className="w-full rounded-lg border border-[#C8DEEE] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#338CF0]"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingNickname} className="rounded-lg bg-[#338CF0] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60">{savingNickname ? '저장 중…' : '저장'}</button>
                  <button type="button" onClick={() => { setEditing(false); setMessage('') }} className="rounded-lg bg-[#F1F6FA] px-3 py-1.5 text-[11px] font-bold">취소</button>
                </div>
              </form>
            ) : (
              <>
                <p className="truncate text-[18px] font-extrabold tracking-[-0.035em]">{nickname}</p>
                <p className="mt-0.5 text-[11px] text-[#8399AD]">우리 동네 빗물받이 집사</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => { setDraftNickname(nickname); setEditing(true); setMessage('') }}
                    className="text-[11px] font-bold text-[#338CF0]"
                  >
                    닉네임 수정
                  </button>
                  {photo && <button type="button" onClick={removePhoto} className="text-[11px] font-medium text-[#8A9EB0]">사진 삭제</button>}
                </div>
              </>
            )}
          </div>
        </div>
        {message && <p role="status" className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] leading-5 text-[#3A78A9]">{message}</p>}
      </section>

      <section className="rounded-[22px] border border-[#E5EEF7] bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">나의 돌봄 기록</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-[#F2F8FF] p-4">
            <p className="text-[11px] font-medium text-[#6C8CA8]">입양한 또랑이</p>
            <p className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[#338CF0]">{adoptedCount}<span className="ml-1 text-[12px] font-bold">개</span></p>
          </div>
          <div className="rounded-[16px] bg-[#F2F8FF] p-4">
            <p className="text-[11px] font-medium text-[#6C8CA8]">최근 14일 점검</p>
            <p className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-[#338CF0]">{recentlyCheckedCount}<span className="ml-1 text-[12px] font-bold">개</span></p>
          </div>
        </div>
        {needsCare.length > 0 ? (
          <Link to="/my-drains" className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#FFF8E8] px-3.5 py-3 text-[12px] font-semibold text-[#956D25]">
            <span>점검이 필요한 또랑이가 {needsCare.length}개 있어요.</span><span aria-hidden="true">›</span>
          </Link>
        ) : (
          <p className="mt-4 rounded-xl bg-[#EAF8F2] p-3 text-[12px] font-semibold text-[#268466]">최근 점검 기록이 모두 14일 이내예요.</p>
        )}
      </section>

      <section className="rounded-[22px] border border-[#E5EEF7] bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">내가 돌보는 또랑이</h3>
          <Link to="/my-drains" className="text-[11px] font-bold text-[#338CF0]">전체 보기 <span aria-hidden="true">›</span></Link>
        </div>
        <div className="mt-4 divide-y divide-[#EFF4F8]">
          {adoptions.length ? adoptions.map((adoption) => {
            const status = getCareStatus(adoption, now)
            return (
              <Link to={`/drains/${adoption.drain.drain_id}`} key={adoption.adoption_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex size-[58px] shrink-0 items-center justify-center rounded-2xl bg-[#F0F8FF]">
                  <Character type="level" level={adoption.level} size={51} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{adoption.adoption_name}</p>
                  <p className="mt-1 truncate text-[11px] text-[#8A9EB2]">Lv.{adoption.level} · {adoption.drain.name}</p>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${statusStyle[status].classes}`}>
                  {statusStyle[status].label}
                </span>
              </Link>
            )
          }) : <p className="py-4 text-center text-[12px] text-[#8096AE]">아직 입양한 또랑이가 없어요.</p>}
        </div>
      </section>

      <section className="rounded-[22px] border border-[#E5EEF7] bg-white px-5 py-4">
        <h3 className="mb-3 text-[15px] font-extrabold">더 알아보기</h3>
        <Link to="/social" className="flex min-h-12 items-center justify-between border-b border-[#EFF4F8] text-[13px] font-semibold">
          <span>친구와 소셜 활동</span><span className="text-lg text-[#A0B1C2]" aria-hidden="true">›</span>
        </Link>
        <Link to="/settings" className="flex min-h-12 items-center justify-between text-[13px] font-semibold">
          <span>설정</span><span className="text-lg text-[#A0B1C2]" aria-hidden="true">›</span>
        </Link>
      </section>
      <p className="px-2 text-center text-[11px] leading-5 text-[#97AABE]">닉네임은 계정에 저장되며, 사진은 현재 브라우저에만 저장됩니다. 돌봄 기록은 현재 앱에 표시된 목록을 기준으로 합니다.</p>
    </div>
  )
}
