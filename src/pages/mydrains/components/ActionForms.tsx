
import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import CameraCapture from '../../../components/common/CameraCapture'

import type {
  ReleaseAdoptionRequest,
} from '../../../types/myDrains'

import type {
  ReleaseReason,
} from '../../../types/drainDetail'

type CapturedImage = {
  file: File
  previewUrl: string
}

type CameraStep = 'before' | 'details' | 'after'

// 점검 기록 작성
export function InspectForm({
  adoptionName,
  onCancel,
}: {
  drainId: number
  adoptionName: string
  onCancel: () => void
}) {
  const [step, setStep] = useState<CameraStep>('before')

  const [beforePhoto, setBeforePhoto] =
    useState<CapturedImage | null>(null)

  const [afterPhoto, setAfterPhoto] =
    useState<CapturedImage | null>(null)

  const [cleaned, setCleaned] = useState(false)
  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] =
    useState(false)

  const [confirmed, setConfirmed] = useState(false)

  // 사진 교체 또는 모달 종료 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (beforePhoto) {
        URL.revokeObjectURL(beforePhoto.previewUrl)
      }
    }
  }, [beforePhoto])

  useEffect(() => {
    return () => {
      if (afterPhoto) {
        URL.revokeObjectURL(afterPhoto.previewUrl)
      }
    }
  }, [afterPhoto])

  // 카메라에서 사진을 촬영했을 때
  const handleCapture = (file: File) => {
    const photo: CapturedImage = {
      file,
      previewUrl: URL.createObjectURL(file),
    }

    if (step === 'before') {
      setBeforePhoto(photo)
    } else if (step === 'after') {
      setAfterPhoto(photo)
    }

    setConfirmed(false)
    setStep('details')
  }

  const handleCameraCancel = () => {
    if (step === 'before' && !beforePhoto) {
      // 첫 촬영 취소: 모달 닫기
      onCancel()
    } else {
      // 재촬영 또는 청소 후 촬영 취소: 폼으로 돌아가기
      setStep('details')
    }
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!beforePhoto) return
    if (!safetyConfirmed) return
    if (cleaned && !afterPhoto) return

    // 나중에 D-1 / D-3 API 연결
    setConfirmed(true)
  }

  // 카메라 화면
  if (step !== 'details') {
    return (
      <CameraCapture
        title={
          step === 'before'
            ? '점검 전 사진 촬영'
            : '청소 후 사진 촬영'
        }
        onCapture={handleCapture}
        onCancel={handleCameraCancel}
      />
    )
  }

  // 사진 촬영 후 입력 화면
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <p className="rounded-xl bg-[#EAF6FF] p-3 text-xs leading-relaxed text-[#447798]">
        안전한 장소에서 점검해주세요.
        비가 오거나 위험할 때는 점검하지 마세요.
        빗물받이 덮개를 직접 열지 마세요.
      </p>

      <h3 className="text-sm font-bold text-[#24496B]">
        {adoptionName}
      </h3>

      {/* 점검 전 사진 */}
      <section className="space-y-2">
        <p className="text-xs font-bold text-[#24496B]">
          점검 전 사진
        </p>

        {beforePhoto && (
          <>
            <img
              src={beforePhoto.previewUrl}
              alt="점검 전 촬영한 빗물받이"
              className="h-[190px] w-full rounded-xl object-cover"
            />

            <p className="text-[10px] text-[#8297AC]">
              촬영 완료 ·{' '}
              {(beforePhoto.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => setStep('before')}
          className="w-full rounded-xl border border-[#CFE4F5] p-3 text-xs font-bold text-[#3489DC]"
        >
          점검 전 사진 다시 촬영
        </button>
      </section>

      {/* 청소 여부 */}
      <label className="flex items-center gap-2 text-xs text-[#24496B]">
        <input
          type="checkbox"
          checked={cleaned}
          onChange={(event) => {
            const checked = event.target.checked

            setCleaned(checked)

            if (!checked) {
              setAfterPhoto(null)
            }

            setConfirmed(false)
          }}
        />
        주변 쓰레기를 청소했어요.
      </label>

      {/* 청소 후 사진 */}
      {cleaned && (
        <section className="space-y-2">
          <p className="text-xs font-bold text-[#24496B]">
            청소 후 사진 (필수)
          </p>

          {afterPhoto ? (
            <>
              <img
                src={afterPhoto.previewUrl}
                alt="청소 후 촬영한 빗물받이"
                className="h-[190px] w-full rounded-xl object-cover"
              />

              <p className="text-[10px] text-[#8297AC]">
                촬영 완료 ·{' '}
                {(afterPhoto.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <div className="flex h-[160px] items-center justify-center rounded-xl bg-[#F1F6FB]">
              <p className="text-xs text-[#8297AC]">
                청소 후 사진을 촬영해주세요.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep('after')}
            className="w-full rounded-xl bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC]"
          >
            {afterPhoto
              ? '청소 후 사진 다시 촬영'
              : '청소 후 사진 촬영'}
          </button>
        </section>
      )}

      {/* 메모 */}
      <label className="block text-xs font-bold text-[#24496B]">
        점검 메모 (선택)

        <textarea
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
            setConfirmed(false)
          }}
          placeholder="빗물받이 상태를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
        />
      </label>

      <p className="rounded-xl bg-[#F5FAFF] p-3 text-[11px] leading-relaxed text-[#8297AC]">
        촬영한 사진과 점검 내용을 확인한 뒤
        제출할 수 있는 화면이에요.
        위치 정보와 촬영 시각의 서버 제출 기능은
        추후 연결할 예정이에요.
      </p>

      {/* 안전 확인 */}
      <label className="flex items-start gap-2 text-xs leading-relaxed text-[#607C99]">
        <input
          type="checkbox"
          checked={safetyConfirmed}
          onChange={(event) => {
            setSafetyConfirmed(event.target.checked)
            setConfirmed(false)
          }}
          required
          className="mt-0.5"
        />

        <span>
          안전수칙을 지켰고, 사진에 얼굴이나 차량 번호판 등
          개인정보가 포함되지 않았음을 확인했어요.
        </span>
      </label>

      <button
        type="submit"
        disabled={
          !beforePhoto ||
          !safetyConfirmed ||
          (cleaned && !afterPhoto)
        }
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        점검 기록 확인
      </button>

      {confirmed && (
        <p
          role="status"
          className="rounded-xl bg-[#E8F7EF] p-3 text-xs leading-relaxed text-[#259B68]"
        >
          촬영한 사진과 점검 입력을 확인했어요.
          현재는 UI 시연용으로 서버에 저장되지 않아요.
        </p>
      )}
    </form>
  )
}

// 입양 해제 폼 (기존 기능 유지)
type ReleaseFormProps = {
  onConfirm: (payload: ReleaseAdoptionRequest) => void
}

export function ReleaseForm({
  onConfirm,
}: ReleaseFormProps) {
  const [reason, setReason] =
    useState<ReleaseReason>('MOVED')

  const [note, setNote] = useState('')

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    onConfirm({
      reason,
      note: note.trim() || undefined,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <p className="text-xs text-[#758B9F]">
        입양을 그만두는 이유를 선택해주세요.
      </p>

      <label className="block text-xs font-semibold">
        해제 사유

        <select
          value={reason}
          onChange={(event) =>
            setReason(
              event.target.value as ReleaseReason,
            )
          }
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3"
        >
          <option value="MOVED">이사</option>
          <option value="NO_TIME">시간 부족</option>
          <option value="OTHER">기타</option>
        </select>
      </label>

      <label className="block text-xs font-semibold">
        추가 설명 (선택)

        <textarea
          value={note}
          maxLength={300}
          onChange={(event) =>
            setNote(event.target.value)
          }
          placeholder="입양 해제 사유를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
      >
        시연 목록에서 입양 해제
      </button>

      <p className="text-[10px] text-[#9AAFC1]">
        화면에서만 해제되며 실제 서버에는 반영되지 않아요.
      </p>
    </form>
  )
}
