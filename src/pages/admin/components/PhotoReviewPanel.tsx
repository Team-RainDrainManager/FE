import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  decideAdminReview,
  getAdminReviews,
  type AdminReviewItem,
  type ReviewType,
} from '../../../apis/admin'
import { getErrorMessage } from '../../../apis/auth'
import { gradeLabel } from '../../../utils/dirtGrade'
import DecisionBar from './DecisionBar'
import { formatDateTime } from './format'

const TYPE_LABELS: Record<ReviewType, string> = {
  INSPECTION: '점검 기록',
  MANAGEMENT_LOG: '관리 기록',
  CLEANING: '청소 기록',
}

const FILTERS: { value: ReviewType | null; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'INSPECTION', label: '점검' },
  { value: 'MANAGEMENT_LOG', label: '관리' },
  { value: 'CLEANING', label: '청소' },
]

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className="min-w-0">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={`${label} 사진`} loading="lazy" className="aspect-[3/4] w-full rounded-xl bg-[#F4F7FB] object-cover" />
        </a>
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-[#F4F7FB] text-[13px] text-[#637790]">사진 없음</div>
      )}
      <figcaption className="mt-1 text-center text-[13px] font-medium text-[#53647E]">{label}</figcaption>
    </figure>
  )
}

function ReviewCard({ item }: { item: AdminReviewItem }) {
  const queryClient = useQueryClient()
  const decide = useMutation({
    mutationFn: ({ approve, reason }: { approve: boolean; reason: string }) =>
      decideAdminReview(item.type, item.id, approve ? 'APPROVE' : 'REJECT', reason),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
      queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
      queryClient.invalidateQueries({ queryKey: ['drain-detail'] }),
    ]),
  })

  const facts = [
    item.beforeGrade != null ? `${item.afterPhotoUrl ? '청소 전' : 'AI 판정'} ${gradeLabel(item.beforeGrade)}` : null,
    item.afterGrade != null ? `청소 후 ${gradeLabel(item.afterGrade)}` : null,
    item.aiConfidence != null ? `AI 확신 ${Math.round(item.aiConfidence * 100)}%` : null,
    item.distanceM != null ? `빗물받이에서 ${item.distanceM}m` : null,
  ].filter((fact): fact is string => fact !== null)

  return (
    <li className="rounded-[22px] border border-[#E2EAF4] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-[15px] font-bold leading-6 text-[#203451]">
            {item.drainName?.trim() || (item.drainId != null ? `빗물받이 #${item.drainId}` : '빗물받이')}
          </h3>
          <p className="mt-0.5 text-[13px] leading-5 text-[#637790]">
            {item.nickname?.trim() || '사용자'} · {formatDateTime(item.createdAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EAF2FF] px-2.5 py-1 text-[12px] font-bold text-[#3981F7]">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
      </div>

      {item.reason && (
        <p className="mt-2 rounded-xl bg-[#FFF4DC] px-3 py-2 text-[13px] font-medium leading-5 text-[#8A6510]">
          검토가 필요한 이유: {item.reason}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Photo url={item.beforePhotoUrl} label={item.afterPhotoUrl ? '청소 전' : '현장'} />
        {item.afterPhotoUrl && <Photo url={item.afterPhotoUrl} label="청소 후" />}
      </div>

      {(facts.length > 0 || item.locationMismatch) && (
        <ul className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-medium">
          {facts.map((fact) => (
            <li key={fact} className="rounded-full bg-[#F4F7FB] px-2.5 py-1 text-[#53647E]">{fact}</li>
          ))}
          {item.locationMismatch && (
            <li className="rounded-full bg-[#FFF1F1] px-2.5 py-1 font-bold text-[#B84D4D]">위치가 멀어요</li>
          )}
        </ul>
      )}

      {item.drainId != null && (
        <Link to={`/drains/${item.drainId}`} className="mt-2 inline-block text-[13px] font-bold text-[#3981F7]">
          빗물받이 상세 보기 ›
        </Link>
      )}

      <DecisionBar
        commentLabel="반려 사유 (사용자에게 보여요)"
        busy={decide.isPending}
        error={decide.isError ? getErrorMessage(decide.error) : ''}
        onDecide={(decision, reason) => decide.mutate({ approve: decision === 'approve', reason })}
      />
    </li>
  )
}

/** 관리자 화면의 사진 검토 탭. AI가 확신하지 못했거나 위치가 맞지 않는 기록을 사람이 확인합니다. */
export default function PhotoReviewPanel() {
  const [type, setType] = useState<ReviewType | null>(null)
  const reviews = useQuery({
    queryKey: ['admin', 'reviews', type],
    queryFn: ({ signal }) => getAdminReviews(type, signal),
    staleTime: 15_000,
  })

  return (
    <section aria-label="사진 검토">
      <div role="group" aria-label="기록 종류" className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={type === filter.value}
            onClick={() => setType(filter.value)}
            className={`min-h-10 rounded-full border px-3.5 text-[13px] font-bold ${
              type === filter.value
                ? 'border-[#3981F7] bg-[#3981F7] text-white'
                : 'border-[#E2EAF4] bg-white text-[#53647E]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {reviews.isPending ? (
        <p role="status" className="py-8 text-center text-[14px] text-[#637790]">검토할 사진을 불러오는 중이에요.</p>
      ) : reviews.isError ? (
        <div role="alert" className="py-8 text-center text-[14px] text-[#B84D4D]">
          <p>{getErrorMessage(reviews.error)}</p>
          <button type="button" onClick={() => void reviews.refetch()} className="mt-3 min-h-11 rounded-xl bg-[#EAF2FF] px-4 font-bold text-[#3981F7]">다시 시도</button>
        </div>
      ) : reviews.data.length === 0 ? (
        <p className="py-10 text-center text-[14px] leading-6 text-[#637790]">
          검토를 기다리는 사진이 없어요.<br />AI가 확신한 기록은 자동으로 처리돼요.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviews.data.map((item) => <ReviewCard key={`${item.type}:${item.id}`} item={item} />)}
        </ul>
      )}
    </section>
  )
}
