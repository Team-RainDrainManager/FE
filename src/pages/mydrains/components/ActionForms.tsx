import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getErrorMessage } from '../../../apis/auth'
import {
  createRegularManagementLog,
  getCurrentCoordinates,
  uploadAdoptionPhoto,
  type ManagementLogResponse,
} from '../../../apis/adoptions'
import CameraCapture from '../../../components/common/CameraCapture'

import type { ReleaseAdoptionRequest } from '../../../types/myDrains'
import type { ReleaseReason } from '../../../types/drainDetail'

type CapturedImage = {
  file: File
  previewUrl: string
}

type CameraStep = 'before' | 'details' | 'after'

type InspectionInput = {
  beforeFile: File
  afterFile?: File
  cleaned: boolean
  memo: string
}

// 입양 후 정기 점검. 비 예보 점검의 requestId는 별도 플로우에서 연결.
export function InspectForm({
  adoptionId,
  drainId,
  adoptionName,
  onCancel,
}: {
  adoptionId: number
  drainId: number
  adoptionName: string
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<CameraStep>('before')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [beforePhoto, setBeforePhoto] = useState<CapturedImage | null>(null)
  const [afterPhoto, setAfterPhoto] = useState<CapturedImage | null>(null)
  const [cleaned, setCleaned] = useState(false)
  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)

  const inspectionMutation = useMutation({
    mutationFn: async ({ beforeFile, afterFile, cleaned, memo }: InspectionInput) => {
      // 위치를 먼저 확인해야 사진만 업로드되고 제출이 실패하는 상황을 줄일 수 있음
      const { latitude, longitude } = await getCurrentCoordinates()
      const beforePhotoKey = await uploadAdoptionPhoto(beforeFile, 'BEFORE')
      const afterPhotoKey = afterFile
        ? await uploadAdoptionPhoto(afterFile, 'AFTER')
        : undefined

      return createRegularManagementLog(adoptionId, {
        type: 'REGULAR',
        actionType: cleaned ? 'CLEANING' : 'INSPECTION',
        beforePhotoKey,
        ...(afterPhotoKey ? { afterPhotoKey } : {}),
        ...(memo ? { memo } : {}),
        latitude,
        longitude,
        safetyAgreed: true,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-adoptions'] }),
        queryClient.invalidateQueries({ queryKey: ['drain-detail', drainId] }),
        queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
      ])
    },
  })

  // 사진 교체·모달 종료 시 Blob URL 정리
  useEffect(() => {
    return () => {
      if (beforePhoto) URL.revokeObjectURL(beforePhoto.previewUrl)
    }
  }, [beforePhoto])

  useEffect(() => {
    return () => {
      if (afterPhoto) URL.revokeObjectURL(afterPhoto.previewUrl)
    }
  }, [afterPhoto])

  // 카메라 촬영과 PC 파일 선택을 동일한 사진 제출 흐름으로 처리
  const handleCapture = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('JPG, PNG, WEBP 파일만 선택할 수 있어요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('사진은 10MB 이하로 선택해 주세요.')
      return
    }

    const photo = { file, previewUrl: URL.createObjectURL(file) }

    if (step === 'before') {
      setBeforePhoto(photo)
    } else if (step === 'after') {
      setAfterPhoto(photo)
    }

    setPhotoError(null)
    setCameraOpen(false)
    inspectionMutation.reset()
    setStep('details')
  }

  const openPhotoStep = (nextStep: 'before' | 'after') => {
    setPhotoError(null)
    setCameraOpen(false)
    setStep(nextStep)
  }

  const handlePhotoCancel = () => {
    setPhotoError(null)
    if (cameraOpen) {
      setCameraOpen(false)
    } else if (step === 'before' && !beforePhoto) {
      onCancel()
    } else {
      setStep('details')
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      inspectionMutation.isPending ||
      inspectionMutation.isSuccess ||
      !beforePhoto ||
      !safetyConfirmed ||
      (cleaned && !afterPhoto)
    ) return

    inspectionMutation.mutate({
      beforeFile: beforePhoto.file,
      afterFile: cleaned ? afterPhoto?.file : undefined,
      cleaned,
      memo: note.trim(),
    })
  }

  if (step !== 'details') {
    const isBefore = step === 'before'
    const title = isBefore ? '점검 전 사진 등록' : '청소 후 사진 등록'

    // 카메라는 사용자가 직접 촬영을 선택했을 때만 활성화
    if (cameraOpen) {
      return (
        <CameraCapture
          title={title}
          onCapture={handleCapture}
          onCancel={handlePhotoCancel}
        />
      )
    }

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#24496B]">{title}</h3>
        <p className="text-xs leading-relaxed text-[#758B9F]">
          모바일에서는 카메라로 촬영하거나, PC에서는 저장된 사진 파일을 선택할 수 있어요.
          두 방법 모두 동일하게 서버에 업로드돼요.
        </p>
        <label className="block space-y-2">
          <span className="block text-xs font-semibold text-[#24496B]">
            사진 파일 선택 (JPG · PNG · WEBP, 최대 10MB)
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) handleCapture(file)
              event.currentTarget.value = ''
            }}
            className="block w-full cursor-pointer rounded-xl border border-[#CFE4F5] bg-white p-3 text-xs text-[#24496B] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:px-3 file:py-2 file:font-semibold file:text-[#3489DC]"
          />
        </label>
        {photoError && (
          <p role="alert" className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]">
            {photoError}
          </p>
        )}
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
        >
          카메라로 촬영하기
        </button>
        <button
          type="button"
          onClick={handlePhotoCancel}
          className="w-full rounded-full border border-[#DCE8F1] bg-white p-3 text-xs font-semibold text-[#607C99]"
        >
          {isBefore && !beforePhoto ? '점검 취소' : '돌아가기'}
        </button>
      </div>
    )
  }

  const submitted = inspectionMutation.data

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-xl bg-[#EAF6FF] p-3 text-xs leading-relaxed text-[#447798]">
        안전한 장소에서 점검해주세요. 비가 오거나 위험할 때는 점검하지 마세요.
        빗물받이 덮개를 직접 열지 마세요.
      </p>

      <h3 className="text-sm font-bold text-[#24496B]">{adoptionName}</h3>

      <section className="space-y-2">
        <p className="text-xs font-bold text-[#24496B]">점검 전 사진</p>
        {beforePhoto && (
          <>
            <img
              src={beforePhoto.previewUrl}
              alt="점검 전 촬영한 빗물받이"
              className="h-[190px] w-full rounded-xl object-cover"
            />
            <p className="text-[10px] text-[#8297AC]">
              촬영 완료 · {(beforePhoto.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </>
        )}
        <button
          type="button"
          disabled={inspectionMutation.isPending || inspectionMutation.isSuccess}
          onClick={() => openPhotoStep('before')}
          className="w-full rounded-xl border border-[#CFE4F5] p-3 text-xs font-bold text-[#3489DC] disabled:opacity-40"
        >
          점검 전 사진 변경 (촬영/파일 선택)
        </button>
      </section>

      <label className="flex items-center gap-2 text-xs text-[#24496B]">
        <input
          type="checkbox"
          checked={cleaned}
          disabled={inspectionMutation.isPending || inspectionMutation.isSuccess}
          onChange={(event) => {
            const checked = event.target.checked
            setCleaned(checked)
            if (!checked) setAfterPhoto(null)
            inspectionMutation.reset()
          }}
        />
        주변 쓰레기를 청소했어요.
      </label>

      {cleaned && (
        <section className="space-y-2">
          <p className="text-xs font-bold text-[#24496B]">청소 후 사진 (필수)</p>
          {afterPhoto ? (
            <>
              <img
                src={afterPhoto.previewUrl}
                alt="청소 후 촬영한 빗물받이"
                className="h-[190px] w-full rounded-xl object-cover"
              />
              <p className="text-[10px] text-[#8297AC]">
                촬영 완료 · {(afterPhoto.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </>
          ) : (
            <div className="flex h-[160px] items-center justify-center rounded-xl bg-[#F1F6FB]">
              <p className="text-xs text-[#8297AC]">청소 후 사진을 촬영해주세요.</p>
            </div>
          )}
          <button
            type="button"
            disabled={inspectionMutation.isPending || inspectionMutation.isSuccess}
            onClick={() => openPhotoStep('after')}
            className="w-full rounded-xl bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC] disabled:opacity-40"
          >
            {afterPhoto ? '청소 후 사진 변경 (촬영/파일 선택)' : '청소 후 사진 등록 (촬영/파일 선택)'}
          </button>
        </section>
      )}

      <label className="block text-xs font-bold text-[#24496B]">
        점검 메모 (선택)
        <textarea
          value={note}
          disabled={inspectionMutation.isPending || inspectionMutation.isSuccess}
          onChange={(event) => {
            setNote(event.target.value)
            inspectionMutation.reset()
          }}
          placeholder="빗물받이 상태를 입력해주세요."
          className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
        />
      </label>

      <p className="rounded-xl bg-[#F5FAFF] p-3 text-[11px] leading-relaxed text-[#8297AC]">
        사진을 서버 저장소에 업로드하고 현재 위치를 이용해 점검 인증을 요청합니다.
        위치가 멀거나 AI 판정이 불확실하면 관리자 검토가 필요할 수 있어요.
      </p>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-[#607C99]">
        <input
          type="checkbox"
          checked={safetyConfirmed}
          disabled={inspectionMutation.isPending || inspectionMutation.isSuccess}
          onChange={(event) => {
            setSafetyConfirmed(event.target.checked)
            inspectionMutation.reset()
          }}
          required
          className="mt-0.5"
        />
        <span>
          안전수칙을 지켰고, 사진에 얼굴이나 차량 번호판 등 개인정보가
          포함되지 않았음을 확인했어요.
        </span>
      </label>

      <button
        type="submit"
        disabled={
          inspectionMutation.isPending ||
          inspectionMutation.isSuccess ||
          !beforePhoto ||
          !safetyConfirmed ||
          (cleaned && !afterPhoto)
        }
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {inspectionMutation.isPending ? '사진 업로드 및 점검 제출 중...' :
          inspectionMutation.isSuccess ? '점검 기록 제출됨' : '사진으로 점검 인증하기'}
      </button>

      {inspectionMutation.isError && (
        <p role="alert" className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]">
          {getErrorMessage(inspectionMutation.error)}
        </p>
      )}

      {submitted && <InspectionResult result={submitted} onClose={onCancel} />}
    </form>
  )
}

function InspectionResult({
  result,
  onClose,
}: {
  result: ManagementLogResponse
  onClose: () => void
}) {
  // HTTP 200은 제출 성공. 인증 승인과 구분해 안내한다.
  const reviewNeeded = result.locationMismatch ||
    result.reviewStatus !== 'NOT_REQUIRED'

  return (
    <div role="status" className="rounded-xl bg-[#E8F7EF] p-3 text-xs leading-relaxed text-[#259B68]">
      <p className="font-bold">
        {reviewNeeded ? '점검 기록을 접수했어요. 검토 상태를 확인해 주세요.' :
          '점검 기록이 서버에 제출됐어요.'}
      </p>
      <p className="mt-1">기록 번호: {result.managementLogId}</p>
      <p className="mt-1">처리 상태: {result.status} / 검토 상태: {result.reviewStatus}</p>
      {result.locationMismatch && (
        <p className="mt-1">점검 위치가 빗물받이와 멀어 관리자 검토가 필요할 수 있어요.</p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-3 rounded-full bg-white px-4 py-2 font-bold text-[#259B68]"
      >
        닫기
      </button>
    </div>
  )
}

type ReleaseFormProps = {
  onConfirm: (payload: ReleaseAdoptionRequest) => void
  isSubmitting: boolean
  errorMessage: string | null
}

export function ReleaseForm({
  onConfirm,
  isSubmitting,
  errorMessage,
}: ReleaseFormProps) {
  const [reason, setReason] = useState<ReleaseReason>('MOVED')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return
    onConfirm({ reason })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-[#758B9F]">
        입양을 그만두는 이유를 선택해주세요.
        입양 기록과 성장 정보는 보관됩니다.
      </p>

      <label className="block text-xs font-semibold">
        해제 사유
        <select
          value={reason}
          disabled={isSubmitting}
          onChange={(event) => setReason(event.target.value as ReleaseReason)}
          className="mt-2 w-full rounded-xl border border-[#DCE8F1] p-3"
        >
          <option value="MOVED">이사</option>
          <option value="NO_TIME">시간 부족</option>
          <option value="OTHER">기타</option>
        </select>
      </label>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {isSubmitting ? '입양 해제 처리 중...' : '입양 그만두기'}
      </button>
    </form>
  )
}
