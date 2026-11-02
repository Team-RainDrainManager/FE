
import { useState } from 'react'

import {
  MOCK_SOCIAL_FEED,
  MOCK_SOCIAL_USERS,
} from '../../../mocks/social'

export default function FeedTab() {
  const [likedIds, setLikedIds] = useState<number[]>([])

  const toggleLike = (id: number) => {
    setLikedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    )
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-base font-extrabold text-[#203451]">
          우리 동네 돌봄 소식
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#78899F]">
          승인된 점검과 또랑이 성장 기록을 모아 보여줘요.
        </p>
      </div>

      {MOCK_SOCIAL_FEED.length === 0 ? (
        <div className="rounded-2xl border border-[#E8EDF5] bg-white px-5 py-12 text-center">
          <span className="text-3xl">🌱</span>
          <p className="mt-3 text-sm font-semibold text-[#7A8FA1]">
            첫 돌봄 소식을 기다리고 있어요.
          </p>
        </div>
      ) : (
        MOCK_SOCIAL_FEED.map((feed) => {
          const user = MOCK_SOCIAL_USERS.find(
            (item) => item.id === feed.userId,
          )

          const liked = likedIds.includes(feed.id)

          return (
            <article
              key={feed.id}
              className="overflow-hidden rounded-[24px] border border-[#E8EDF5] bg-white"
            >
              <div className="flex items-center gap-3 px-4 pt-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF6F0] text-xl">
                  {user?.avatar ?? '🌱'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#203451]">
                    {user?.nickname ?? '동네 집사'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9AA9B6]">
                    {feed.dateLabel}
                  </p>
                </div>

                <span
                  className={`
                    rounded-full px-2.5 py-1.5
                    text-[11px] font-bold
                    ${
                      feed.type === 'growth'
                        ? 'bg-[#EAF1FF] text-[#5289C7]'
                        : 'bg-[#E6F7EF] text-[#319A75]'
                    }
                  `}
                >
                  {feed.type === 'growth'
                    ? '성장 소식'
                    : '점검 완료'}
                </span>
              </div>

              <div className="px-4 py-4">
                <h3 className="text-sm font-bold text-[#385A73]">
                  {feed.drainName}
                </h3>

                <p className="mt-2 text-[13px] leading-6 text-[#71889B]">
                  {feed.description}
                </p>

                <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${feed.type === 'growth' ? 'bg-[#EAF2FF] text-[#3981F7]' : 'bg-[#EAF7EF] text-[#32865A]'}`}>
                  <span aria-hidden="true">{feed.type === 'growth' ? '🌿' : '💧'}</span>
                  {feed.type === 'growth' ? '또랑이 성장 기록' : '승인된 점검 기록'}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#EDF2F6] px-4 py-3">
                <button
                  type="button"
                  aria-pressed={liked}
                  onClick={() => toggleLike(feed.id)}
                  className={`
                    flex items-center gap-2 text-sm font-bold
                    ${
                      liked
                        ? 'text-[#F07585]'
                        : 'text-[#8496A5]'
                    }
                  `}
                >
                  <span className="text-lg">
                    {liked ? '♥' : '♡'}
                  </span>

                  {liked ? '응원했어요' : '응원하기'}
                </button>

                <span className="text-xs text-[#97A6B3]">
                  {feed.likes + (liked ? 1 : 0)}명 응원
                </span>
              </div>
            </article>
          )
        })
      )}

      <p className="px-1 pb-2 text-center text-[11px] text-[#9AA9B6]">
        미리보기 · 응원은 현재 화면에서만 기록돼요.
      </p>
    </div>
  )
}
