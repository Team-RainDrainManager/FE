
import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import {
  getAdoptionInspections,
  type AdoptionInspection,
} from '../../../apis/adoption-inspections'
import { getErrorMessage } from '../../../apis/auth'

type Props = {
  adoptionId: number
}

function getKindLabel(kind: string) {
  const labels: Record<string, string> = {
    ROUTINE: '정기 점검',
    FORECAST: '비 예보 점검',
    SUBSTITUTE: '대신 점검',
  }

  return labels[kind] ?? '점검'
}

function getReviewLabel(review: string) {
  const labels: Record<string, string> = {
    NOT_REQUIRED: '인증 완료',
    PENDING: '검토 중',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
  }

  return labels[review] ?? review
}

function InspectionItem({
  item,
}: {
  item: AdoptionInspection
}) {
  const hasBeforePhoto =
    !item.photoDeleted && Boolean(item.beforePhotoUrl)

  const hasAfterPhoto =
    !item.photoDeleted && Boolean(item.afterPhotoUrl)

  return (
    <article className="rounded-xl border border-[#E4EDF7] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-xs text-[#203451]">
          {getKindLabel(item.kind)}
        </strong>

        <span className="rounded-lg bg-[#EAF2FF] px-2 py-1 text-[10px] font-semibold text-[#3981F7]">
          {getReviewLabel(item.review)}
        </span>
      </div>

      <p className="mt-2 text-[11px] text-[#78899F]">
        {new Date(item.createdAt).toLocaleString('ko-KR')}
      </p>

      <div className="mt-2 flex items-center justify-between text-xs text-[#607C99]">
        <span>
          {item.cleaned ? '청소 완료' : '상태 점검'}
        </span>

        <strong className="text-[#2784C9]">
          +{item.xp} XP
        </strong>
      </div>

      {item.photoDeleted ? (
        <p className="mt-3 rounded-lg bg-[#F4F7FC] p-3 text-center text-[11px] text-[#8297AC]">
          사진 보관 기간이 종료됐어요.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {hasBeforePhoto && (
            <div>
              <p className="mb-1 text-[10px] text-[#78899F]">
                점검 전
              </p>
              <img
                src={item.beforePhotoUrl ?? ''}
                alt="점검 전 사진"
                loading="lazy"
                className="h-28 w-full rounded-lg object-cover"
              />
            </div>
          )}

          {hasAfterPhoto && (
            <div>
              <p className="mb-1 text-[10px] text-[#78899F]">
                청소 후
              </p>
              <img
                src={item.afterPhotoUrl ?? ''}
                alt="청소 후 사진"
                loading="lazy"
                className="h-28 w-full rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function InspectionHistory({
  adoptionId,
}: Props) {
  const [open, setOpen] = useState(false)

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
      getAdoptionInspections(
        adoptionId,
        pageParam,
        10,
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.inspections.length > 0
        ? (lastPage.nextCursor ?? undefined)
        : undefined,
    enabled: open && adoptionId > 0,
    staleTime: 30_000,
    retry: 1,
  })

  const inspections =
    data?.pages.flatMap((page) => page.inspections) ?? []

  return (
    <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-bold text-[#203451]">
          점검 이력
        </h3>

        <span className="text-xs font-semibold text-[#3981F7]">
          {open ? '접기 −' : '기록 보기 +'}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {isPending ? (
            <p className="py-5 text-center text-xs text-[#78899F]">
              점검 이력을 불러오는 중이에요.
            </p>
          ) : isError && inspections.length === 0 ? (
            <div className="py-4 text-center">
              <p
                role="alert"
                className="text-xs text-[#B84D4D]"
              >
                {getErrorMessage(error)}
              </p>

              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 text-xs font-semibold text-[#3981F7]"
              >
                다시 시도
              </button>
            </div>
          ) : inspections.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#8C9AB0]">
              아직 점검 기록이 없어요.
            </p>
          ) : (
            <>
              {inspections.map((item) => (
                <InspectionItem
                  key={item.inspectionId}
                  item={item}
                />
              ))}

              {hasNextPage && (
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                  className="w-full rounded-xl bg-[#EAF2FF] p-3 text-xs font-semibold text-[#3981F7] disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? '불러오는 중...'
                    : '점검 이력 더 보기'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
