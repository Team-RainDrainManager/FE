
import { useEffect, useState } from 'react'
import FriendInviteDialog from './FriendInviteDialog'

import {
  CURRENT_SOCIAL_USER_ID,
  MOCK_SOCIAL_USERS,
} from '../../../mocks/social'
import type { SocialUser } from '../../../types/social'

export default function FriendsTab() {
  const users = MOCK_SOCIAL_USERS.filter(
    (user) => user.id !== CURRENT_SOCIAL_USER_ID,
  )

  const [friendIds, setFriendIds] = useState<number[]>(()=>{
    try {const value=JSON.parse(localStorage.getItem('ddorang:demo-friends')??'[]') as unknown
      return Array.isArray(value)?value.filter((item):item is number=>typeof item==='number'):[]
    } catch {return []}
  })
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(
    null,
  )
  const [invitationOpen, setInvitationOpen] = useState(false)
  const [inviteNotice, setInviteNotice] = useState('')
  useEffect(() => {
    if (!inviteNotice) return
    const timeout = window.setTimeout(() => setInviteNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [inviteNotice])
  const [cheeredIds, setCheeredIds] = useState<number[]>([])
  const [pokeIds, setPokeIds] = useState<number[]>([])
  const [notice, setNotice] = useState('')

  function pokeFriend(id:number) {
    if(!friendIds.includes(id)||pokeIds.includes(id))return
    setPokeIds(previous=>[...previous,id]);setNotice('찌르기를 시연했습니다. 실제 알림은 전송되지 않습니다.')
  }


  const toggleFriend = (id: number) => {
    setFriendIds((previous) => {
      const next=previous.includes(id)?previous.filter((value)=>value!==id):[...previous,id]
      try {localStorage.setItem('ddorang:demo-friends',JSON.stringify(next))} catch { /* ignore */ }
      return next
    })
  }

  const cheerForFriend = (id: number) => {
    if (!friendIds.includes(id)) return
    if (cheeredIds.includes(id)) return

    setCheeredIds((previous) => [...previous, id])
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E8EDF5] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#203451]">
              내 친구
            </h2>
            <p className="mt-1 text-xs text-[#78899F]">
              {friendIds.length}명과 함께 물길을 돌보고 있어요
            </p>
          </div>

          <span className="rounded-full bg-[#EAF4FF] px-3 py-1.5 text-xs font-bold text-[#3981F7]">
            {friendIds.length}명
          </span>
        </div>

        <button
          type="button"
          onClick={() => setInvitationOpen(true)}
          className="mt-4 w-full rounded-xl border border-[#CBE3F8] bg-[#F0F8FF] py-3 text-sm font-bold text-[#3981F7]"
        >
          친구 초대하기
        </button>
      </section>

      <p className="px-1 text-xs leading-5 text-[#78899F]">
        추천 친구는 시연 데이터입니다. 카카오 친구 목록 조회는 별도의 권한·서버 연동이 필요합니다.
      </p>

      <div className="space-y-3">
        {users.map((user) => {
          const isFriend = friendIds.includes(user.id)

          return (
            <article
              key={user.id}
              className="rounded-2xl border border-[#E8EDF5] bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF6F0] text-2xl">
                  {user.avatarUrl?<img src={user.avatarUrl} alt={`${user.nickname} 프로필 사진`} className="h-full w-full rounded-full object-cover"/>:user.avatar}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-extrabold text-[#203451]">
                    {user.nickname}
                  </h3>
                  <p className="mt-1 text-xs text-[#78899F]">
                    또랑이 {user.drains.length}개 돌봄 중
                  </p>
                </div>

                {isFriend ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full bg-[#EAF7EF] px-2 py-1 text-[11px] font-bold text-[#32865A]">친구</span>
                    <details className="relative" onKeyDown={(event) => {
                      if (event.key === 'Escape') event.currentTarget.open = false
                    }}>
                      <summary aria-label={`${user.nickname} 친구 관리`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-lg text-[#78899F] hover:bg-[#F4F7FC] [&::-webkit-details-marker]:hidden">···</summary>
                      <button type="button" onClick={() => toggleFriend(user.id)} className="absolute right-0 top-full z-10 whitespace-nowrap rounded-xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs font-semibold text-[#C85D5D] shadow-lg">친구 해제</button>
                    </details>
                  </div>
                ) : (
                  <button type="button" onClick={() => toggleFriend(user.id)} className="shrink-0 rounded-full bg-[#EAF2FF] px-3 py-2 text-xs font-bold text-[#3981F7]">+ 친구 추가</button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(user)}
                className="mt-4 w-full rounded-xl border border-[#E3EDF5] py-2.5 text-xs font-bold text-[#4C7795]"
              >
                관리 현황 보기
              </button>
            </article>
          )
        })}
      </div>

      {notice&&<p role="status" className="rounded-xl bg-[#EAF4FF] p-3 text-xs text-[#3976B5]">{notice}</p>}

      {invitationOpen && (
        <FriendInviteDialog onClose={() => setInvitationOpen(false)} onNotice={setInviteNotice} />
      )}
      {inviteNotice && <div className="rd-invite-toast" role="status" aria-live="polite">{inviteNotice}</div>}

      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="friend-detail-title"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3
                id="friend-detail-title"
                className="text-lg font-extrabold text-[#203451]"
              >
                {selectedUser.nickname}의 돌봄
              </h3>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="친구 관리 현황 닫기"
                className="px-2 text-xl text-[#78899F]"
              >
                ×
              </button>
            </div>

            <div className="mt-3 flex justify-center"><span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#EAF6F0] text-3xl">{selectedUser.avatarUrl?<img src={selectedUser.avatarUrl} alt="친구 프로필 사진" className="h-full w-full object-cover"/>:selectedUser.avatar}</span></div>
            <div className="mt-4 space-y-2">
              {selectedUser.drains.length === 0 ? (
                <p className="rounded-xl bg-[#F5F9FC] p-4 text-center text-sm text-[#78899F]">
                  아직 입양한 또랑이가 없어요.
                </p>
              ) : (
                selectedUser.drains.map((drain) => (
                  <div
                    key={drain.id}
                    className="flex items-center justify-between rounded-xl bg-[#F2F8FC] px-3 py-3"
                  >
                    <span className="text-sm font-semibold text-[#385A73]">
                      {drain.name}
                    </span>

                    <span className="text-xs font-bold text-[#3981F7]">
                      Lv.{drain.level}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              disabled={
                !friendIds.includes(selectedUser.id) ||
                cheeredIds.includes(selectedUser.id)
              }
              onClick={() => cheerForFriend(selectedUser.id)}
              className="mt-5 w-full rounded-xl bg-[#3981F7] py-3 text-sm font-bold text-white disabled:bg-[#DCE7EF] disabled:text-[#7D91A0]"
            >
              {!friendIds.includes(selectedUser.id)
                ? '친구 추가 후 응원 가능'
                : cheeredIds.includes(selectedUser.id)
                  ? '♥ 응원 표시됨'
                  : '♡ 돌봄 응원 보내기'}
            </button>

            <button type="button" disabled={!friendIds.includes(selectedUser.id)||pokeIds.includes(selectedUser.id)} onClick={()=>pokeFriend(selectedUser.id)} className="mt-2 w-full rounded-xl border border-[#C9DBEA] bg-[#F5F9FC] py-3 text-sm font-bold text-[#3976B5] disabled:opacity-50">{pokeIds.includes(selectedUser.id)?'오늘 찌르기 시연 완료':'관리 잊지 말기 · 찌르기'}</button>
            <p className="mt-2 text-center text-[11px] text-[#78899F]">응원과 찌르기는 화면 시연이며 상대방에게 실제 알림이 전송되지 않습니다.</p>
          </section>
        </div>
      )}
    </div>
  )
}
