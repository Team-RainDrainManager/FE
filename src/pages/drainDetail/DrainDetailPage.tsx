
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'

import {
  getAdoptionDrainDetail,
  getMyAdoptionList,
} from '../../apis/adoptions'
import { useAuthStore } from '../../store/useAuthStore'

import DrainInfo from './components/DrainInfo'
import DrainPhoto from './components/DrainPhoto'
import DrainGrowth from './components/DrainGrowth'
import DrainActions from './components/DrainActions'

export default function DrainDetailPage() {
  const { drainId } = useParams()
  const id = Number(drainId)
  const validId = Number.isInteger(id) && id > 0

  const accessToken = useAuthStore(
    (state) => state.accessToken,
  )

  const {
    data: drain,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drain-detail', id],
    queryFn: ({ signal }) =>
      getAdoptionDrainDetail(id, signal),
    enabled: validId,
    staleTime: 30_000,
    retry: 1,
  })

  const { data: myAdoptions } = useQuery({
    queryKey: ['my-adoptions'],
    queryFn: getMyAdoptionList,
    enabled: Boolean(accessToken),
    staleTime: 30_000,
    retry: 1,
  })

  const isMine =
    drain?.adoption != null &&
    (myAdoptions?.adoptions.some(
      (item) =>
        item.adoptionId === drain.adoption?.adoptionId,
    ) ?? false)

  if (!validId) {
    return (
      <div className="px-5 py-16 text-center">
        <p>올바르지 않은 빗물받이 번호예요.</p>
        <Link to="/map" className="text-[#3981F7]">
          지도로 돌아가기
        </Link>
      </div>
    )
  }

  if (isPending) {
    return (
      <div
        role="status"
        className="px-5 py-16 text-center text-sm text-[#78899F]"
      >
        빗물받이 정보를 불러오는 중이에요.
      </div>
    )
  }

  if (isError || !drain) {
    return (
      <div className="px-5 py-16 text-center">
        <h2 className="text-base font-bold text-[#203451]">
          빗물받이 정보를 불러오지 못했어요.
        </h2>

        <p className="mt-2 text-xs text-[#78899F]">
          {error instanceof Error
            ? error.message
            : '잠시 후 다시 시도해 주세요.'}
        </p>

        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-full bg-[#6099E8] px-5 py-3 text-xs font-bold text-white"
        >
          다시 시도
        </button>

        <Link
          to="/map"
          className="ml-3 text-xs text-[#3981F7]"
        >
          지도로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] space-y-4 bg-[#F4F7FC] px-4 pb-7 pt-5">
      <div className="overflow-hidden rounded-[24px] border border-[#E8EDF5] bg-white shadow-[0_4px_18px_rgba(23,43,77,0.04)]">
        <DrainInfo drain={drain} />

        <DrainGrowth
          adoption={drain.adoption}
        />
      </div>

      <DrainPhoto drain={drain} />

      <DrainActions
        drain={drain}
        isMine={isMine}
      />
    </div>
  )
}
