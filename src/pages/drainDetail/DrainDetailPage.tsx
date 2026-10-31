
import { Link, useParams } from 'react-router'
import {
  MOCK_DRAIN_DETAILS,
  MOCK_DRAIN_GROWTH,
  MOCK_MY_ADOPTION_IDS,
} from '../../mocks/drainDetail'

import DrainInfo from './components/DrainInfo'
import DrainPhoto from './components/DrainPhoto'
import DrainGrowth from './components/DrainGrowth'
import DrainActions from './components/DrainActions'

export default function DrainDetailPage() {
  const { drainId } = useParams()
  const id = Number(drainId)

  // UI 시연용 데이터
  // API 연동 시 TanStack Query로 교체
  const response = MOCK_DRAIN_DETAILS[id]
  const drain =
    response?.success && response.data
      ? response.data
      : null

  const growth = MOCK_DRAIN_GROWTH[id]

  if (!drain) {
    return (
      <div className="px-5 py-16 text-center">
        <h2 className="text-lg font-bold text-[#203451]">
          빗물받이 정보를 찾을 수 없어요.
        </h2>

        <p className="mt-2 text-xs text-[#78899F]">
          등록되지 않은 빗물받이 번호예요.
        </p>

        <Link
          to="/my-drains"
          className="mt-5 inline-block rounded-full bg-[#6099E8] px-5 py-3 text-xs font-bold text-white"
        >
          또랑이 페이지로 돌아가기
        </Link>
      </div>
    )
  }

  // 이 값은 상세 조회 API에 없음
  // 추후 GET /api/users/me/adoptions 결과로 판단
  const isMine =
    drain.adoption !== null &&
    MOCK_MY_ADOPTION_IDS.includes(drain.adoption.adoptionId)

  return (
    <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] space-y-4 bg-[#F4F7FC] px-4 pb-7 pt-5">
      <div className="overflow-hidden rounded-[24px] border border-[#E8EDF5] bg-white shadow-[0_4px_18px_rgba(23,43,77,0.04)]">
      <DrainInfo drain={drain} />

      <DrainGrowth
        adoption={drain.adoption}
        growth={growth}
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
