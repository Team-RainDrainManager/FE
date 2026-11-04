
import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import CameraCapture from '../../../components/common/CameraCapture'

import {
  getCurrentCoordinates,
  registerAdoption,
  startAdoptionCleaning,
  uploadAdoptionPhoto,
  verifyAdoptionCleaning,
} from '../../../apis/adoptions'

import { getErrorMessage } from '../../../apis/auth'
import type { ReleaseReason } from '../../../types/drainDetail'

const SAFETY_RULES = [
  '인도 등 안전한 장소에서만 점검할게요.',
  '비가 내리거나 위험한 상황에서는 점검하지 않을게요.',
  '빗물받이 덮개를 직접 열지 않을게요.',
]

type Phase =
  | 'before'
  | 'after'
  | 'register'
  | 'blocked'
  | 'success'

type CameraMode = 'before' | 'after' | null

type AdoptFormProps = {
  drainId: number
  onClose: () => void
}

export function AdoptForm({
  drainId,
  onClose,
}: AdoptFormProps) {
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('before')
  const [camera, setCamera] = useState<CameraMode>(null)

  const [beforePhoto, setBeforePhoto] =
    useState<File | null>(null)
  const [afterPhoto, setAfterPhoto] =
    useState<File | null>(null)

  const [cleaningId, setCleaningId] =
    useState<number | null>(null)

  const [name, setName] = useState('')
  const [safety, setSafety] = useState([
    false,
    false,
    false,
  ])
  const [pledge, setPledge] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const safetyAgreed =
    safety.every(Boolean) && pledge

  const canRegister =
    cleaningId !== null &&
    name.trim().length > 0 &&
    safetyAgreed &&
    !busy

  const handleCapture = (file: File) => {
    if (camera === 'before') {
      setBeforePhoto(file)
    }

    if (camera === 'after') {
      setAfterPhoto(file)
    }

    setCamera(null)
    setError('')
  }

  // 1. 청소 전 사진 업로드 및 AI 판정
  const handleStartCleaning = async () => {
    if (!beforePhoto || busy) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const coordinates =
        await getCurrentCoordinates()

      const photoKey = await uploadAdoptionPhoto(
  beforePhoto,
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

      if (result.blocked || result.needsReport) {
        setPhase('blocked')
        return
      }

      if (result.mustClean) {
        setPhase('after')
        setNotice(
          '청소가 필요한 빗물받이예요. 안전하게 청소한 뒤 사진을 촬영해 주세요.',
        )
      } else {
        setPhase('register')
        setNotice(
          '추가 청소가 필요하지 않은 것으로 판정됐어요. 입양 정보를 입력해 주세요.',
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // 2. 청소 후 사진으로 AI 인증
  const handleVerifyCleaning = async () => {
    if (
      cleaningId === null ||
      !afterPhoto ||
      busy
    ) {
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const photoKey = await uploadAdoptionPhoto(
  afterPhoto,
  'AFTER',
)

      const result =
        await verifyAdoptionCleaning(
          cleaningId,
          photoKey,
        )

      if (result.passed) {
        setPhase('register')
        setNotice(
          '청소 인증을 통과했어요. 이제 입양할 수 있어요.',
        )
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
          현재 AI 판정 결과 추가 확인 또는 제보가
          필요한 빗물받이예요.
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
      <p className="rounded-xl bg-[#EAF6FF] p-3 text-xs leading-relaxed text-[#447798]">
        안전한 장소에서 촬영해 주세요.
        위험한 상황에서는 청소를 진행하지 마세요.
        사진 인증에는 위치 권한이 필요합니다.
      </p>

      {phase === 'before' && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[#24496B]">
            1. 청소 전 사진
          </h3>

          <button
            type="button"
            disabled={busy}
            onClick={() => setCamera('before')}
            className="w-full rounded-xl bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC]"
          >
            카메라로 촬영
          </button>

          <label className="block text-xs font-semibold text-[#24496B]">
            또는 사진 선택
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy}
              onChange={(event) =>
                setBeforePhoto(
                  event.target.files?.[0] ?? null,
                )
              }
              className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
            />
          </label>

          {beforePhoto && (
            <p className="text-xs text-[#607C99]">
              선택한 사진: {beforePhoto.name}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleStartCleaning()}
            disabled={!beforePhoto || busy}
            className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy
              ? 'AI 판정 중...'
              : '사진 제출하고 청소 판정하기'}
          </button>
        </section>
      )}

      {phase === 'after' && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-[#24496B]">
            2. 청소 후 사진 인증
          </h3>

          <button
            type="button"
            disabled={busy}
            onClick={() => setCamera('after')}
            className="w-full rounded-xl bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC]"
          >
            청소 후 사진 촬영
          </button>

          <label className="block text-xs font-semibold text-[#24496B]">
            또는 사진 선택
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy}
              onChange={(event) =>
                setAfterPhoto(
                  event.target.files?.[0] ?? null,
                )
              }
              className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
            />
          </label>

          {afterPhoto && (
            <p className="text-xs text-[#607C99]">
              선택한 사진: {afterPhoto.name}
            </p>
          )}

          <button
            type="button"
            disabled={!afterPhoto || busy}
            onClick={() => void handleVerifyCleaning()}
            className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy
              ? '청소 인증 중...'
              : '청소 완료 인증하기'}
          </button>
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

          <div className="space-y-3">
            <p className="text-xs font-semibold">
              안전수칙 확인
            </p>

            {SAFETY_RULES.map((rule, index) => (
              <label
                key={rule}
                className="flex gap-2 text-xs leading-relaxed"
              >
                <input
                  type="checkbox"
                  checked={safety[index]}
                  onChange={(event) =>
                    setSafety((previous) =>
                      previous.map((value, i) =>
                        i === index
                          ? event.target.checked
                          : value,
                      ),
                    )
                  }
                />
                {rule}
              </label>
            ))}
          </div>

          <label className="flex gap-2 text-xs">
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
            className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy
              ? '입양 등록 중...'
              : '입양 완료하기'}
          </button>
        </form>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-[#EAF6FF] p-3 text-xs leading-relaxed text-[#447798]"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#FDECEC] p-3 text-xs text-[#C85858]"
        >
          {error}
        </p>
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
