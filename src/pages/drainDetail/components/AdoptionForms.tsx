
import { useContext, useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import CameraCapture, { type CaptureMeta } from '../../../components/common/CameraCapture'
import type { Box } from '../../../components/common/camera/box'
import type { Coordinates } from '../../../components/common/camera/geo'
import { isPhotoStale, STALE_PHOTO_MESSAGE } from '../../../components/common/camera/image'
import { requestMotionPermission } from '../../../components/common/camera/motion'
import PhotoSubmitStatus from '../../../components/common/camera/PhotoSubmitStatus'
import SafetyStart from '../../../components/common/camera/SafetyStart'
import {
  clearDraft,
  flowDraftKey,
  loadDraft,
  loadDraftPhoto,
  saveDraft,
} from '../../../features/flow-draft/flow-draft'
import { AccountId } from '../../../features/missions/wallet'

import {
  getCurrentCoordinates,
  registerAdoption,
  startAdoptionCleaning,
  uploadAdoptionPhoto,
  verifyAdoptionCleaning,
} from '../../../apis/adoptions'

import { getErrorMessage } from '../../../apis/auth'
import type { ReleaseReason } from '../../../types/drainDetail'

type Phase =
  | 'before'
  | 'after'
  | 'register'
  | 'blocked'
  | 'success'

type CameraMode = 'before' | 'after' | null

// 창을 닫아도 이어서 하도록 남기는 값입니다. 사진은 flow-draft가 메모리에 따로 둡니다.
type AdoptionDraft = {
  phase: Phase
  cleaningId: number | null
  name: string
  safetyConfirmed: boolean
  pledge: boolean
  notice: string
  beforeBox: Box | null
}

const AI_WAIT_NOTE = '길면 1분쯤 걸려요.'

type AdoptFormProps = {
  drainId: number
  onClose: () => void
}

export function AdoptForm({
  drainId,
  onClose,
}: AdoptFormProps) {
  const queryClient = useQueryClient()
  const account = useContext(AccountId)

  const draftKey = flowDraftKey('adoption', account, drainId)
  const [draft] = useState(() => loadDraft<AdoptionDraft>(draftKey))

  const [phase, setPhase] = useState<Phase>(draft?.phase ?? 'before')
  const [camera, setCamera] = useState<CameraMode>(null)

  const [beforePhoto, setBeforePhoto] =
    useState<File | null>(() => loadDraftPhoto(draftKey, 'before'))
  const [beforeBox, setBeforeBox] =
    useState<Box | null>(draft?.beforeBox ?? null)
  const [afterPhoto, setAfterPhoto] =
    useState<File | null>(() => loadDraftPhoto(draftKey, 'after'))

  const [cleaningId, setCleaningId] =
    useState<number | null>(draft?.cleaningId ?? null)

  const [name, setName] = useState(draft?.name ?? '')
  const [safetyConfirmed, setSafetyConfirmed] =
    useState(draft?.safetyConfirmed ?? false)
  const [pledge, setPledge] = useState(draft?.pledge ?? false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(draft?.notice ?? '')
  // 새로고침으로 사진만 사라진 첫 단계는 이어서 할 것이 없습니다.
  const [resumed, setResumed] = useState(
    draft !== null && (draft.phase !== 'before' || beforePhoto !== null),
  )

  // 진행 상황 저장. 끝나거나 아직 시작 전이면 지웁니다.
  useEffect(() => {
    if (
      phase === 'success' ||
      phase === 'blocked' ||
      (phase === 'before' && !beforePhoto && !safetyConfirmed)
    ) {
      clearDraft(draftKey)
      return
    }

    saveDraft<AdoptionDraft>(
      draftKey,
      { phase, cleaningId, name, safetyConfirmed, pledge, notice, beforeBox },
      { before: beforePhoto, after: afterPhoto },
    )
  }, [
    draftKey,
    phase,
    cleaningId,
    name,
    safetyConfirmed,
    pledge,
    notice,
    beforeBox,
    beforePhoto,
    afterPhoto,
  ])

  const openCamera = (mode: 'before' | 'after') => {
    // 아이폰 센서 권한은 버튼을 누른 순간에만 물을 수 있습니다.
    void requestMotionPermission()
    setError('')
    setCamera(mode)
  }

  const restart = () => {
    clearDraft(draftKey)
    setPhase('before')
    setBeforePhoto(null)
    setBeforeBox(null)
    setAfterPhoto(null)
    setCleaningId(null)
    setName('')
    setSafetyConfirmed(false)
    setPledge(false)
    setError('')
    setNotice('')
    setResumed(false)
  }

  const canRegister =
    cleaningId !== null &&
    name.trim().length > 0 &&
    pledge &&
    !busy

  // 1. 청소 전 사진 업로드 및 AI 판정
  const submitBefore = async (
    photo: File,
    knownCoordinates: Coordinates | null,
    box: Box | null,
  ) => {
    if (busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const coordinates =
        knownCoordinates ?? await getCurrentCoordinates()

      const photoKey = await uploadAdoptionPhoto(
  photo,
  'BEFORE',
)

      const result = await startAdoptionCleaning(
        drainId,
        {
          photoKey,
          ...coordinates,
        },
      )

      setCleaningId(result.cleaningId)
      setResumed(false)

      // 서버는 막힘이면서 신고가 필요할 때만 막고, 이때 제보도 자동으로 접수합니다.
      if (result.blocked) {
        clearDraft(draftKey)
        setPhase('blocked')
        return
      }

      const nextPhase = result.mustClean ? 'after' : 'register'
      const nextNotice = result.mustClean
        ? '청소가 필요한 빗물받이예요. 흰 점선 범위까지 안전하게 청소한 뒤 사진을 찍어 주세요.'
        : '추가 청소가 필요하지 않은 것으로 판정됐어요. 입양 정보를 입력해 주세요.'

      // AI 판정을 기다리다 창을 닫았어도 청소 번호가 남도록 바로 저장합니다.
      saveDraft<AdoptionDraft>(
        draftKey,
        {
          phase: nextPhase,
          cleaningId: result.cleaningId,
          name,
          safetyConfirmed,
          pledge,
          notice: nextNotice,
          beforeBox: box,
        },
        { before: photo, after: null },
      )
      setPhase(nextPhase)
      setNotice(nextNotice)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // 2. 청소 후 사진으로 AI 인증
  const submitAfter = async (
    photo: File,
    knownCoordinates: Coordinates | null,
  ) => {
    if (cleaningId === null || busy) return

    setBusy(true)
    setError('')

    try {
      // 서버는 청소 후 사진을 찍은 위치도 빗물받이와 맞는지 확인합니다.
      const coordinates =
        knownCoordinates ?? await getCurrentCoordinates()

      const photoKey = await uploadAdoptionPhoto(
  photo,
  'AFTER',
)

      const result =
        await verifyAdoptionCleaning(
          cleaningId,
          {
            photoKey,
            ...coordinates,
          },
        )

      setResumed(false)

      if (result.passed) {
        const nextNotice = '청소 인증을 통과했어요. 이제 입양할 수 있어요.'

        saveDraft<AdoptionDraft>(
          draftKey,
          {
            phase: 'register',
            cleaningId,
            name,
            safetyConfirmed,
            pledge,
            notice: nextNotice,
            beforeBox,
          },
          { before: beforePhoto, after: photo },
        )
        setPhase('register')
        setNotice(nextNotice)
      } else {
        setAfterPhoto(null)
        setNotice(
          `청소 인증을 통과하지 못했어요. 다시 청소하고 새 사진을 촬영해 주세요. (${result.attemptNo}회차)`,
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // 찍으면 바로 AI 판정으로 넘어갑니다.
  const handleCapture = (file: File, meta: CaptureMeta) => {
    const mode = camera
    setCamera(null)

    if (mode === 'before') {
      setBeforePhoto(file)
      setBeforeBox(meta.box)
      void submitBefore(file, meta.coordinates, meta.box)
    }

    if (mode === 'after') {
      setAfterPhoto(file)
      void submitAfter(file, meta.coordinates)
    }
  }

  // 3. 최종 입양 등록
  const handleRegister = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!canRegister || cleaningId === null) return

    setBusy(true)
    setError('')

    try {
      await registerAdoption(drainId, {
        cleaningId,
        nickname: name.trim(),
        safetyAgreed: true,
      })

      clearDraft(draftKey)
      setPhase('success')

      // 상세·지도·본인 입양 목록 재조회
      void queryClient.invalidateQueries({
        queryKey: ['drain-detail', drainId],
      })

      void queryClient.invalidateQueries({
        queryKey: ['map-drains'],
      })

      void queryClient.invalidateQueries({
        queryKey: ['my-adoptions'],
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (camera !== null) {
    return (
      <CameraCapture
        title={
          camera === 'before'
            ? '청소 전 사진 촬영'
            : '청소 후 사진 촬영'
        }
        drainId={drainId}
        boxNote={
          camera === 'before'
            ? '청소할 때는 흰 점선까지 치워 주세요.'
            : '흰 점선 안쪽까지 깨끗한지 확인해 주세요.'
        }
        reference={
          camera === 'after' && beforePhoto && beforeBox
            ? { file: beforePhoto, box: beforeBox }
            : null
        }
        onCapture={handleCapture}
        onCancel={() => setCamera(null)}
      />
    )
  }

  if (phase === 'success') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-bold text-[#259B68]">
          입양이 완료됐어요!
        </p>

        <p className="text-sm text-[#607C99]">
          {name.trim()}와 함께 돌봄을 시작해 보세요.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
        >
          확인
        </button>
      </div>
    )
  }

  if (phase === 'blocked') {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-[#FFF4E3] p-4 text-xs leading-relaxed text-[#956222]">
          덮개 안쪽까지 막혀 시민이 치우기 어려운 빗물받이예요.
          지자체에서 확인하도록 제보를 자동으로 접수했어요.
          지금은 입양을 진행하지 않아요.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {resumed && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F4F7FC] p-3 text-xs text-[#3E5670]">
          <span>하던 입양을 이어서 진행해요.</span>
          <button
            type="button"
            disabled={busy}
            onClick={restart}
            className="shrink-0 font-bold text-[#3489DC] underline disabled:opacity-40"
          >
            처음부터 다시
          </button>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-[#EAF6FF] p-3 text-sm leading-relaxed text-[#2F5570]"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#FDECEC] p-3 text-sm leading-relaxed text-[#B84D4D]"
        >
          {error}
        </p>
      )}

      {phase === 'before' && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[#24496B]">
            1. 청소 전 사진
          </h3>

          {beforePhoto ? (
            <PhotoSubmitStatus
              file={beforePhoto}
              alt="청소 전 빗물받이"
              busy={busy}
              busyText={`AI가 사진을 확인하고 있어요. ${AI_WAIT_NOTE}`}
              retryLabel="다시 판정받기"
              onRetake={() => openCamera('before')}
              onRetry={() => {
                if (isPhotoStale(beforePhoto)) {
                  setBeforePhoto(null)
                  setError(STALE_PHOTO_MESSAGE)
                  return
                }
                void submitBefore(beforePhoto, null, beforeBox)
              }}
            />
          ) : safetyConfirmed ? (
            <button
              type="button"
              onClick={() => openCamera('before')}
              className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white"
            >
              카메라로 촬영
            </button>
          ) : (
            <SafetyStart
              onStart={() => {
                setSafetyConfirmed(true)
                setCamera('before')
              }}
            />
          )}

          <p className="text-xs leading-relaxed text-[#607C99]">
            사진 인증에는 위치 권한이 필요해요.
          </p>
        </section>
      )}

      {phase === 'after' && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[#24496B]">
            2. 청소 후 사진 인증
          </h3>

          {afterPhoto ? (
            <PhotoSubmitStatus
              file={afterPhoto}
              alt="청소 후 빗물받이"
              busy={busy}
              busyText={`청소가 잘 됐는지 AI가 확인하고 있어요. ${AI_WAIT_NOTE}`}
              retryLabel="다시 인증받기"
              onRetake={() => openCamera('after')}
              onRetry={() => {
                if (isPhotoStale(afterPhoto)) {
                  setAfterPhoto(null)
                  setError(STALE_PHOTO_MESSAGE)
                  return
                }
                void submitAfter(afterPhoto, null)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => openCamera('after')}
              className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white"
            >
              청소 후 사진 촬영
            </button>
          )}
        </section>
      )}

      {phase === 'register' && (
        <form
          onSubmit={(event) =>
            void handleRegister(event)
          }
          className="space-y-4"
        >
          <h3 className="text-sm font-bold text-[#24496B]">
            3. 또랑이 입양 등록
          </h3>

          <label className="block text-xs font-semibold text-[#24496B]">
            또랑이 이름
            <input
              required
              maxLength={20}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="또랑이 이름 입력"
              className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
            />
          </label>

          <label className="flex gap-2 text-sm leading-relaxed text-[#24496B]">
            <input
              type="checkbox"
              checked={pledge}
              onChange={(event) =>
                setPledge(event.target.checked)
              }
            />
            14일마다 점검하는 약속에 동의합니다.
          </label>

          <button
            type="submit"
            disabled={!canRegister}
            className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white disabled:opacity-40"
          >
            {busy
              ? '입양 등록 중...'
              : '입양 완료하기'}
          </button>
        </form>
      )}
    </div>
  )
}

// 기존 입양 해제 UI 유지
export function ReleaseForm() {
  const [reason, setReason] =
    useState<ReleaseReason>('MOVED')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-semibold">
        입양 해제 사유

        <select
          value={reason}
          onChange={(event) =>
            setReason(
              event.target.value as ReleaseReason,
            )
          }
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        >
          <option value="MOVED">이사</option>
          <option value="NO_TIME">시간 부족</option>
          <option value="OTHER">기타</option>
        </select>
      </label>

      <label className="block text-xs font-semibold">
        추가 설명 (선택)

        <textarea
          maxLength={300}
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="사유를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
      >
        입양 해제 화면 확인
      </button>

      {submitted && (
        <p
          role="status"
          className="rounded-xl bg-[#E8F7EF] p-3 text-xs text-[#259B68]"
        >
          입력값 확인 완료. 실제 입양은 해제되지 않았어요.
        </p>
      )}
    </form>
  )
}
