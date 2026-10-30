
import { useState } from 'react'
import { Link } from 'react-router'
import Character from '../../components/common/Character'
import {
  MOCK_MY_ADOPTIONS,
  MOCK_PAUSE_STATUS,
} from '../../mocks/myDrain'
import type {
  DrainModalType,
  MyAdoptionsResponse,
  MyPauseStatus,
  PageModal,
  ReleaseAdoptionRequest,
} from '../../types/myDrains'
import DrainCard from './components/DrainCard'
import DrainModal from './components/DrainModal'
import { isPauseActive } from './utils'

const DAY_MS = 24 * 60 * 60 * 1000

const REASON_LABELS: Record<
  ReleaseAdoptionRequest['reason'],
  string
> = {
  MOVED: '이사',
  NO_TIME: '시간 부족',
  OTHER: '기타',
}

export default function MyDrainsPage() {
  const [data, setData] = useState<MyAdoptionsResponse>(
    () => ({
      ...MOCK_MY_ADOPTIONS,
      adoptions: MOCK_MY_ADOPTIONS.adoptions.map(
        (item) => ({
          ...item,
          drain: { ...item.drain },
        }),
      ),
    }),
  )

  const [pauseStatus, setPauseStatus] =
    useState<MyPauseStatus>({ ...MOCK_PAUSE_STATUS })

  const [modal, setModal] = useState<PageModal>(null)
  const [feedback, setFeedback] = useState('')

  const openModal = (nextModal: DrainModalType) => {
    setModal(nextModal)
  }

  const closeModal = () => setModal(null)

  // B-5 입양 해제 UI 시연
  const handleRelease = (
    adoptionId: number,
    payload: ReleaseAdoptionRequest,
  ) => {
    setData((previous) => {
      const adoptions = previous.adoptions.filter(
        (item) => item.adoption_id !== adoptionId,
      )

      return {
        ...previous,
        count: adoptions.length,
        adoptions,
      }
    })

    setFeedback(
      `시연 목록에서 입양을 해제했어요. 사유: ${
        REASON_LABELS[payload.reason]
      }`,
    )

    closeModal()
  }

  // A-11 점검 쉬기 UI 시연
  const handleApplyPause = () => {
    if (
      !pauseStatus.can_apply ||
      isPauseActive(pauseStatus.active_until) ||
      data.adoptions.length === 0
    ) {
      return
    }

    const now = Date.now()
    const until = new Date(now + 14 * DAY_MS).toISOString()
    const nextAvailable = new Date(
      now + 90 * DAY_MS,
    ).toISOString()

    setPauseStatus({
      can_apply: false,
      active_until: until,
      next_available_at: nextAvailable,
    })

    // 내 입양 전체에 점검 쉬기 표시
    setData((previous) => ({
      ...previous,
      adoptions: previous.adoptions.map((item) => ({
        ...item,
        pause_until: until,
      })),
    }))

    setFeedback(
      '점검 쉬기를 시연 화면에만 적용했어요.',
    )

    closeModal()
  }

  return (
    <div className="px-[18px] pb-7 pt-5 text-[#24496B]">
      <section className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">
            각자의 속도로 자라는 또랑
          </h2>

          <p className="mt-2 text-[11px] text-[#7F96AF]">
            빗물받이마다 레벨과 경험치가 따로 있어요.
          </p>
        </div>

        <Character
          type="state"
          state="happy"
          size={66}
        />
      </section>

      <div className="mb-4 mt-6 flex justify-between px-1">
        <h3 className="text-sm font-extrabold">
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
              accountPauseUntil={pauseStatus.active_until}
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
        className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#7B889F] shadow-md"
      >
        지도에서 찾아보기
      </Link>

      <button
        type="button"
        onClick={() => openModal({ type: 'pause' })}
        className="mt-4 block text-xs font-semibold text-[#3489DC]"
      >
        점검 쉬기 신청
      </button>

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
          className="mt-3 block text-xs font-semibold text-[#3489DC]"
        >
          Lv.0~50 성장 도감
        </button>
      )}

      {modal && (
        <DrainModal
          modal={modal}
          adoptions={data.adoptions}
          pauseStatus={pauseStatus}
          onOpen={openModal}
          onClose={closeModal}
          onRelease={handleRelease}
          onApplyPause={handleApplyPause}
        />
      )}
    </div>
  )
}
