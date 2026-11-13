import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
  getAdoptionInspections,
  type AdoptionInspection,
} from '../../../apis/adoption-inspections'
import { getErrorMessage } from '../../../apis/auth'
import { getInspectionDetail } from '../../../apis/inspections'
import { gradeLabel } from '../../../utils/dirtGrade'

const KIND_LABELS: Record<string, string> = {
  ROUTINE: '정기 점검',
  FORECAST: '비 예보 점검',
  SUBSTITUTE: '대신 점검',
}

const REVIEW_LABELS: Record<string, string> = {
  NOT_REQUIRED: '인증 완료',
  PENDING: '검토 중',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
}

type InspectionPhotosProps = {
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
  photoDeleted?: boolean
}

function InspectionPhotos({
  beforePhotoUrl,
  afterPhotoUrl,
  photoDeleted,
}: InspectionPhotosProps) {
  if (photoDeleted) {
    return (
      <p className="mt-3 rounded-lg bg-[#F4F7FC] p-3 text-xs text-[#637790]">
        사진 보존 기간(365일)이 지나 삭제되었어요.
      </p>
    )
  }

  if (!beforePhotoUrl && !afterPhotoUrl) {
    return <p className="mt-3 text-xs text-[#637790]">표시할 사진이 없어요.</p>
  }

  return (
    <div className={`mt-3 grid gap-2 ${beforePhotoUrl && afterPhotoUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {beforePhotoUrl && (
        <figure className="min-w-0">
          <img
            src={beforePhotoUrl}
            alt="점검 전 빗물받이"
            loading="lazy"
            className="block aspect-video w-full rounded-lg object-cover"
          />
          <figcaption className="mt-1 text-[11px] text-[#637790]">점검 전</figcaption>
        </figure>
      )}
      {afterPhotoUrl && (
        <figure className="min-w-0">
          <img
            src={afterPhotoUrl}
            alt="청소 후 빗물받이"
            loading="lazy"
            className="block aspect-video w-full rounded-lg object-cover"
          />
          <figcaption className="mt-1 text-[11px] text-[#637790]">청소 후</figcaption>
        </figure>
      )}
    </div>
  )
}

function InspectionDetailPanel({ inspectionId }: { inspectionId: number }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['inspection-detail', inspectionId],
    queryFn: ({ signal }) => getInspectionDetail(inspectionId, signal),
    staleTime: 30_000,
    retry: 1,
  })

  if (isPending) {
    return (
      <p role="status" className="mt-3 text-xs text-[#637790]">
        점검 상세 정보를 불러오는 중이에요.
      </p>
    )
  }

  if (isError || !data) {
    return (
      <div className="mt-3 space-y-2 text-xs text-[#B84D4D] [html[data-dd-theme=dark]_&]:text-[#ffc9d2]">
        <p role="alert">{getErrorMessage(error)}</p>
        <button type="button" onClick={() => void refetch()} className="font-bold underline">
          다시 조회
        </button>
      </div>
    )
  }

    return (
    <section
      aria-label="점검 상세 정보"
      className="mt-3 rounded-xl bg-[#F4F7FC] px-3 py-2 text-xs leading-5"
    >
      <dl className="divide-y divide-[#E1E8F1]">
        <div className="flex justify-between gap-3 py-2">
          <dt className="text-[#53647E]">오염 등급 변화</dt>
          <dd className="text-right font-semibold text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
            {gradeLabel(data.beforeGrade)} → {gradeLabel(data.afterGrade)}
          </dd>
        </div>

        <div className="flex justify-between gap-3 py-2">
          <dt className="text-[#53647E]">점검 위치 거리</dt>
          <dd className="text-right font-semibold text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
            {data.distanceM == null ? '정보 없음' : `${data.distanceM}m`}
          </dd>
        </div>

        <div className="flex justify-between gap-3 py-2">
          <dt className="text-[#53647E]">막힘 제보</dt>
          <dd className="text-right font-semibold text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
            {data.hasBlockageReport ? '제보 있음' : '제보 없음'}
          </dd>
        </div>
      </dl>

      {data.reviewReason && (
        <p className="mt-2 whitespace-pre-wrap break-words border-t border-[#E1E8F1] pt-2 text-[#53647E]">
          검토 사유: {data.reviewReason}
        </p>
      )}

      {data.note && (
        <p className="mt-2 whitespace-pre-wrap break-words border-t border-[#E1E8F1] pt-2 text-[#53647E]">
          메모: {data.note}
        </p>
      )}
    </section>
  )
}

function InspectionItem({ item }: { item: AdoptionInspection }) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <details className="group border-b border-[#EDF2F6] last:border-b-0">
      <summary className="flex min-h-[69px] cursor-pointer list-none items-center gap-[11px] py-[11px] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EBF5FC] [html[data-dd-theme=dark]_&]:bg-[#283f5b] text-[#276C9B] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {item.kind === 'FORECAST' || item.kind === 'SUBSTITUTE' ? (
              <path d="M6 15h11a4 4 0 0 0 0-8h-1a5 5 0 0 0-9 1H6a3.5 3.5 0 0 0 0 7ZM9 18l-1 2m5-2-1 2m5-2-1 2" />
            ) : (
              <path d="M8 4h8m-8 3h8m-9-3H5v16h14V4h-2M8 13l2 2 5-5" />
            )}
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <strong className="block text-[13px] text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
            {KIND_LABELS[item.kind] ?? '점검'}
          </strong>
          <span className="mt-1 block text-[11px] tabular-nums text-[#536A7A] [html[data-dd-theme=dark]_&]:text-[var(--dd-muted)]">
            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
          </span>
        </span>

        <strong className="shrink-0 rounded-lg bg-[#EDF7F0] [html[data-dd-theme=dark]_&]:bg-[#203b34] px-2 py-1.5 text-[11px] text-[#267557] [html[data-dd-theme=dark]_&]:text-[#8fe0b8]">
          {item.xp > 0 ? '+' : ''}{item.xp} XP
        </strong>

        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-3.5 shrink-0 text-[#276C9B] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)] group-open:rotate-180"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>

      <div className="border-t border-[#EDF2F6] pt-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <strong className="text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">{item.cleaned ? '청소 완료' : '상태 점검'}</strong>
          <span className="rounded-lg bg-[#E6F3FD] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-2 py-1 font-semibold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]">
            {REVIEW_LABELS[item.review] ?? item.review}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-[#637790]">
          {new Date(item.createdAt).toLocaleString('ko-KR')}
        </p>

        <InspectionPhotos
          beforePhotoUrl={item.beforePhotoUrl}
          afterPhotoUrl={item.afterPhotoUrl}
          photoDeleted={Boolean(item.photoDeleted)}
        />

        <button
          type="button"
          aria-expanded={detailOpen}
          onClick={() => setDetailOpen((current) => !current)}
          className="mt-3 min-h-10 w-full rounded-lg bg-[#E6F3FD] [html[data-dd-theme=dark]_&]:bg-[#283f5b] px-3 py-2 text-xs font-semibold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]"
        >
          {detailOpen ? '점검 상세 접기 −' : '점검 상세 보기 +'}
        </button>

        {detailOpen && <InspectionDetailPanel inspectionId={item.inspectionId} />}
      </div>
    </details>
  )
}

export default function InspectionHistory({ adoptionId }: { adoptionId: number }) {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['adoption-inspections', adoptionId],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam, signal }) =>
      getAdoptionInspections(adoptionId, pageParam, 10, signal),
    getNextPageParam: (lastPage) =>
      lastPage.inspections.length > 0
        ? lastPage.nextCursor ?? undefined
        : undefined,
    enabled: adoptionId > 0,
    staleTime: 30_000,
    retry: 1,
  })

  const inspections = data?.pages.flatMap((page) => page.inspections) ?? []

  return (
    <section aria-label="최근 돌봄 기록">
      <h3 className="mx-px mb-[11px] text-base font-extrabold tracking-tight text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
        최근 돌봄 기록
      </h3>

      <div className="rounded-[22px] border border-[#DFEBF3] bg-[var(--dd-surface)] px-4 py-0.5 shadow-[0_10px_30px_rgba(40,81,111,0.055)]">
        {isPending && (
          <p role="status" className="py-5 text-center text-xs text-[#536A7A] [html[data-dd-theme=dark]_&]:text-[var(--dd-muted)]">
            점검 이력을 불러오는 중이에요.
          </p>
        )}

        {isError && inspections.length === 0 && (
          <div className="py-4 text-center text-xs">
            <p role="alert" className="text-[#B84D4D] [html[data-dd-theme=dark]_&]:text-[#ffc9d2]">{getErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 font-semibold text-[#276C9B] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)]"
            >
              다시 시도
            </button>
          </div>
        )}

        {!isPending && !isError && inspections.length === 0 && (
          <p className="py-5 text-center text-xs text-[#536A7A] [html[data-dd-theme=dark]_&]:text-[var(--dd-muted)]">
            아직 점검 기록이 없어요.
          </p>
        )}

        <div>
          {inspections.map((item) => (
            <InspectionItem key={item.inspectionId} item={item} />
          ))}
        </div>

        {hasNextPage && (
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="my-3 w-full rounded-xl bg-[#E6F3FD] [html[data-dd-theme=dark]_&]:bg-[#283f5b] p-3 text-xs font-semibold text-[#185881] [html[data-dd-theme=dark]_&]:text-[var(--dd-blue)] disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중...' : '점검 이력 더 보기'}
          </button>
        )}
      </div>
    </section>
  )
}
