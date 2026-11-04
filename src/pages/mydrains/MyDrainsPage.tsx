
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { getErrorMessage } from '../../apis/auth'
import {
  getMyAdoptions,
  toMyAdoptionsView,
} from '../../apis/my-drains'

import Character from '../../components/common/Character'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'

import type {
  DrainModalType,
  PageModal,
} from '../../types/myDrains'

import DrainCard from './components/DrainCard'
import DrainModal from './components/DrainModal'

export default function MyDrainsPage() {
  // 점검 쉬기는 기존 상태 유지 (별도 API 연동 예정)
  const pauseStatus = useMyDrainsStore(
    (state) => state.pauseStatus,
  )

  const [modal, setModal] = useState<PageModal>(null)
  const [feedback, setFeedback] = useState('')

  // 실제 서버 데이터 조회
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-adoptions'],
    queryFn: ({ signal }) => getMyAdoptions(signal),
    select: toMyAdoptionsView,
    staleTime: 30_000,
  })

  const openModal = (nextModal: DrainModalType) => {
    setModal(nextModal)
  }

  const closeModal = () => setModal(null)

  // 입양 해제 API는 이번 작업 범위에 포함되지 않음
  const handleRelease = () => {
    setFeedback(
      '입양 해제 API는 아직 연결되지 않았어요. 실제 입양 상태는 유지됩니다.',
    )
    closeModal()
  }

  if (isPending) {
    return (
      <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] bg-[#F4F7FC] px-4 py-16 text-center">
        <Character
          type="state"
          state="happy"
          size={75}
        />

        <p
          role="status"
          className="mt-4 text-sm font-semibold text-[#78899F]"
        >
          내 또랑이를 불러오는 중이에요.
        </p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] bg-[#F4F7FC] px-4 py-16 text-center">
        <h2 className="text-base font-bold text-[#203451]">
          내 또랑이 목록을 불러오지 못했어요.
        </h2>

        <p
          role="alert"
          className="mt-3 text-xs text-[#78899F]"
        >
          {getErrorMessage(error)}
        </p>

        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 rounded-full bg-[#6099E8] px-5 py-3 text-xs font-bold text-white"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-128px-env(safe-area-inset-bottom))] bg-[#F4F7FC] px-4 pb-7 pt-5 text-[#203451]">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">
            각자의 속도로 자라는 또랑
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-[#78899F]">
            빗물받이마다 레벨과 경험치가 따로 있어요.
          </p>
        </div>

        <Character
          type="state"
          state="happy"
          size={60}
        />
      </section>

      <div className="mb-4 mt-6 flex justify-between px-1">
        <h3 className="text-base font-bold">
          함께 돌보는 또랑
        </h3>

        <span className="text-xs text-[#8091AC]">
          {data.count} / {data.limit}
        </span>
      </div>

      {feedback && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-[#EAF6FF] p-3 text-xs"
        >
          {feedback}
        </p>
      )}

      {data.adoptions.length > 0 ? (
        <div className="space-y-[14px]">
          {data.adoptions.map((adoption) => (
            <DrainCard
              key={adoption.adoption_id}
              adoption={adoption}
              accountPauseUntil={
                pauseStatus.active_until
              }
              onOpen={openModal}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E8F1F9] p-6 text-center">
          <div className="flex justify-center">
            <Character
              type="level"
              level={0}
              size={130}
            />
          </div>

          <p className="mt-3 text-sm font-bold">
            첫 또랑을 기다리고 있어요.
          </p>

          <p className="mt-2 text-xs text-[#8195AC]">
            지도에서 입양할 빗물받이를 찾아보세요.
          </p>
        </div>
      )}

      <Link
        to="/map"
        className="mt-4 flex min-h-12 items-center justify-center rounded-full border border-[#E0E8F3] bg-white text-[13px] font-bold text-[#3981F7] shadow-sm"
      >
        지도에서 찾아보기
      </Link>

      {data.adoptions.length > 0 && (
        <button
          type="button"
          onClick={() =>
            openModal({
              type: 'growth',
              drainId:
                data.adoptions[0].drain.drain_id,
            })
          }
          className="ml-2 mt-3 inline-flex min-h-10 items-center rounded-xl border border-[#E0E8F3] bg-white px-3 text-xs font-semibold text-[#3981F7]"
        >
          Lv.0~50 성장 도감
        </button>
      )}

      {modal && (
        <DrainModal
          modal={modal}
          adoptions={data.adoptions}
          onOpen={openModal}
          onClose={closeModal}
          onRelease={handleRelease}
        />
      )}
    </div>
  )
}
