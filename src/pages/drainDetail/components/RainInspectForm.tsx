
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getCurrentCoordinates,
  uploadAdoptionPhoto,
} from '../../../apis/adoptions'
import { getErrorMessage } from '../../../apis/auth'
import {
  completeInspection,
  getInspectionEligibility,
  getInspectionEligibilityMessage,
  startInspection,
  type InspectionSubmitResponse,
} from '../../../apis/inspections'
import CameraCapture from '../../../components/common/CameraCapture'

type CapturedImage = {
  file: File
  previewUrl: string
}

type PhotoStep = 'before' | 'after' | 'details'


type Props = {
  drainId: number
  requestId?: number
  kind: 'ROUTINE' | 'FORECAST' | 'SUBSTITUTE'
  adoptionName: string
  onCancel: () => void
}


const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]


function ResultMessage({
  result,
  onClose,
}: {
  result: InspectionSubmitResponse
  onClose: () => void
}) {
  const isCompleted = result.status === 'COMPLETED'

  const message = {
    COMPLETED: '점검이 완료됐어요!',
    PENDING: '점검 결과를 검토 중이에요.',
    REJECTED: '점검 인증이 반려됐어요.',
    NEEDS_CLEANING: '청소 후 사진이 필요해요.',
  }[result.status]

  return (
    <div
      role="status"
      className="space-y-3 rounded-xl bg-[#E8F7EF] p-5 text-center text-sm text-[#259B68]"
    >
      <p className="font-bold">{message}</p>

      {isCompleted && (
        <p className="text-base font-bold">
          +{result.xpAwarded} XP
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-3 rounded-full bg-white px-5 py-2 text-xs font-bold text-[#259B68]"
      >
        확인
      </button>
    </div>
  )
}


export default function RainInspectForm({
  drainId,
  requestId,
  kind,
  adoptionName,
  onCancel,
}: Props) {
  const queryClient = useQueryClient()

  const [photoStep, setPhotoStep] =
    useState<PhotoStep>('before')

  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoError, setPhotoError] =
    useState<string | null>(null)

  const [beforePhoto, setBeforePhoto] =
    useState<CapturedImage | null>(null)

  const [afterPhoto, setAfterPhoto] =
    useState<CapturedImage | null>(null)

  const [capturedAt, setCapturedAt] =
    useState<string | null>(null)

  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] =
    useState(false)

  const [startResult, setStartResult] =
    useState<InspectionSubmitResponse | null>(null)

  const [finalResult, setFinalResult] =
    useState<InspectionSubmitResponse | null>(null)

  const needsCleaning =
    startResult?.status === 'NEEDS_CLEANING'

  // 점검 화면 진입 전 현재 계정이 이 빗물받이를 점검할 수 있는지 확인
  const eligibilityRequestId =
    kind === 'ROUTINE' ? undefined : requestId

  const eligibilityEnabled =
    Number.isSafeInteger(drainId) &&
    drainId > 0 &&
    (kind === 'ROUTINE' ||
      (eligibilityRequestId !== undefined &&
        Number.isSafeInteger(eligibilityRequestId) &&
        eligibilityRequestId > 0))

  const {
    data: eligibility,
    isPending: eligibilityPending,
    isFetching: eligibilityFetching,
    isError: eligibilityError,
    error: eligibilityQueryError,
    refetch: refetchEligibility,
  } = useQuery({
    queryKey: ['inspection-eligibility', drainId, kind, eligibilityRequestId ?? null],
    queryFn: ({ signal }) => getInspectionEligibility(
      drainId,
      eligibilityRequestId,
      signal,
    ),
    enabled: eligibilityEnabled && startResult === null,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  // 점검 이후 최신 데이터 불러오기
  
const refreshData = async () => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['rain-requests'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['my-adoptions'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['drain-detail', drainId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['map-drains'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['adoption-inspections'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['drain-growth', drainId],
    }),
  ])
}


  // 1단계: 점검 전 사진 제출 및 AI 판정
  const startMutation = useMutation({
    mutationFn: async () => {
      if (
        !beforePhoto ||
        !capturedAt ||
        !safetyConfirmed
      ) {
        throw new Error(
          '점검 전 사진과 안전수칙 확인이 필요해요.',
        )
      }

      // 서버는 제출 시에도 재검증하지만, 먼저 확인해 불필요한 업로드 방지
      const latestEligibility = await getInspectionEligibility(
        drainId,
        eligibilityRequestId,
      )
      if (!latestEligibility.eligible) {
        throw new Error(getInspectionEligibilityMessage(latestEligibility))
      }

      // GPS 위치 먼저 확인
      const { latitude, longitude } =
        await getCurrentCoordinates()

      // 점검 전 사진 업로드
      const beforeKey = await uploadAdoptionPhoto(
        beforePhoto.file,
        'BEFORE',
      )

      // 점검 시작 API 호출
      return startInspection({
  drainId,
  kind,
  ...(eligibilityRequestId !== undefined ? { requestId: eligibilityRequestId } : {}),
  beforeKey,
  latitude,
  longitude,
  capturedAt,
  ...(note.trim() ? { note: note.trim() } : {}),
  safetyConfirmed: true,
})
    },

    onSuccess: async (result) => {
      setStartResult(result)

      if (result.status === 'NEEDS_CLEANING') {
        // 청소가 필요한 경우에만 사진 추가
        setPhotoStep('after')
      } else {
        // COMPLETED / PENDING / REJECTED
        setFinalResult(result)
        await refreshData()
      }
    },
  })

  // 2단계: 청소 후 사진 제출
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (
        !needsCleaning ||
        !startResult ||
        !afterPhoto ||
        !safetyConfirmed
      ) {
        throw new Error(
          '청소 후 사진과 안전수칙 확인이 필요해요.',
        )
      }

      const afterKey = await uploadAdoptionPhoto(
        afterPhoto.file,
        'AFTER',
      )

      // 기존 inspectionId로 완료 요청
      return completeInspection(
        startResult.inspectionId,
        {
          afterKey,
          safetyConfirmed: true,
        },
      )
    },

    onSuccess: async (result) => {
      setFinalResult(result)
      await refreshData()
    },
  })

  // 사진 미리보기 메모리 정리
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

  const handleCapture = (file: File) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      setPhotoError(
        'JPG, PNG, WEBP 파일만 선택할 수 있어요.',
      )
      return
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError(
        '사진은 10MB 이하로 선택해 주세요.',
      )
      return
    }

    const photo: CapturedImage = {
      file,
      previewUrl: URL.createObjectURL(file),
    }

    if (photoStep === 'before') {
      setBeforePhoto(photo)

      // 카메라 촬영/파일 선택 시점
      setCapturedAt(new Date().toISOString())
      startMutation.reset()
    } else if (photoStep === 'after') {
      setAfterPhoto(photo)
      completeMutation.reset()
    }

    setCameraOpen(false)
    setPhotoError(null)
    setPhotoStep('details')
  }

  const openPhotoStep = (
    step: 'before' | 'after',
  ) => {
    // 서버에 시작 기록을 만든 뒤에는
    // 다른 점검 시작 요청을 중복 생성하지 않음
    if (startResult && step === 'before') {
      return
    }

    setPhotoError(null)
    setCameraOpen(false)
    setPhotoStep(step)
  }

  const handlePhotoCancel = () => {
    if (cameraOpen) {
      setCameraOpen(false)
      return
    }

    if (
      photoStep === 'before' &&
      !beforePhoto
    ) {
      onCancel()
      return
    }

    setPhotoStep('details')
  }

  const pending =
    startMutation.isPending ||
    completeMutation.isPending

  // 자격 확인 전에는 카메라·사진 업로드를 진행하지 않음
  if (!eligibilityEnabled) {
    return (
      <div role="alert" className="space-y-3 rounded-xl bg-[#FFF4DC] p-4 text-xs text-[#956222]">
        <p>점검할 빗물받이 또는 비 예보 요청 정보가 올바르지 않아요.</p>
        <button type="button" onClick={onCancel} className="font-bold underline">닫기</button>
      </div>
    )
  }

  if ((eligibilityPending || eligibilityFetching) && !startResult) {
    return <p role="status" className="py-5 text-center text-xs text-[#78899F]">점검 가능 여부를 확인하고 있어요.</p>
  }

  if ((eligibilityError || !eligibility) && !startResult) {
    return (
      <div className="space-y-3 rounded-xl bg-[#FFF1F1] p-4 text-xs text-[#B84D4D]">
        <p role="alert">{getErrorMessage(eligibilityQueryError)}</p>
        <div className="flex gap-4">
          <button type="button" onClick={() => void refetchEligibility()} className="font-bold underline">다시 확인</button>
          <button type="button" onClick={onCancel} className="font-bold underline">닫기</button>
        </div>
      </div>
    )
  }

  if (eligibility && !eligibility.eligible && !startResult) {
    return (
      <div className="space-y-3 rounded-xl bg-[#FFF4DC] p-4 text-xs text-[#956222]">
        <p role="alert" className="font-bold">현재 점검할 수 없어요.</p>
        <p>{getInspectionEligibilityMessage(eligibility)}</p>
        <div className="flex gap-4">
          <button type="button" onClick={() => void refetchEligibility()} className="font-bold underline">다시 확인</button>
          <button type="button" onClick={onCancel} className="font-bold underline">닫기</button>
        </div>
      </div>
    )
  }

  // 카메라 또는 파일 선택 화면
  if (
    photoStep !== 'details' &&
    !finalResult
  ) {
    const before = photoStep === 'before'

    const title = before
      ? '점검 전 사진 등록'
      : '청소 후 사진 등록'

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
        <h3 className="text-sm font-bold text-[#24496B]">
          {title}
        </h3>

        {needsCleaning && !before && (
          <p className="rounded-xl bg-[#FFF4DC] p-3 text-xs leading-5 text-[#A97822]">
            AI 판정 결과 청소가 필요해요.
            주변 쓰레기를 안전하게 청소한 뒤
            사진을 등록해 주세요.
          </p>
        )}

        <p className="text-xs leading-relaxed text-[#758B9F]">
          모바일에서는 카메라로 촬영하거나
          PC에서 사진을 선택할 수 있어요.
          JPG · PNG · WEBP, 최대 10MB까지 지원해요.
        </p>

        <label className="block space-y-2">
          <span className="block text-xs font-semibold text-[#24496B]">
            사진 파일 선택
          </span>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file =
                event.currentTarget.files?.[0]

              if (file) {
                handleCapture(file)
              }

              event.currentTarget.value = ''
            }}
            className="block w-full cursor-pointer rounded-xl border border-[#CFE4F5] bg-white p-3 text-xs text-[#24496B] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF6FF] file:px-3 file:py-2 file:font-semibold file:text-[#3489DC]"
          />
        </label>

        {photoError && (
          <p
            role="alert"
            className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]"
          >
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
          {before && !beforePhoto
            ? '점검 취소'
            : '돌아가기'}
        </button>
      </div>
    )
  }

  // AI 최종 결과 화면
  if (finalResult) {
    return (
      <ResultMessage
        result={finalResult}
        onClose={onCancel}
      />
    )
  }

  // 점검 정보 및 제출 화면
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()

        if (
          pending ||
          !safetyConfirmed
        ) {
          return
        }

        if (needsCleaning) {
          completeMutation.mutate()
        } else {
          startMutation.mutate()
        }
      }}
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

      
<p className="text-xs font-semibold text-[#3981F7]">
  {kind === 'ROUTINE'
    ? '일반 정기 점검'
    : kind === 'SUBSTITUTE'
      ? '대신 점검'
      : '비 예보 점검'}

  {requestId !== undefined && (
    <> · 요청 #{requestId}</>
  )}
</p>


      <section className="space-y-2">
        <p className="text-xs font-bold text-[#24496B]">
          점검 전 사진
        </p>

        {beforePhoto && (
          <img
            src={beforePhoto.previewUrl}
            alt="점검 전 빗물받이"
            className="h-[190px] w-full rounded-xl object-cover"
          />
        )}

        {!startResult && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              openPhotoStep('before')
            }
            className="w-full rounded-xl border border-[#CFE4F5] p-3 text-xs font-bold text-[#3489DC] disabled:opacity-40"
          >
            점검 전 사진 변경 (촬영/파일 선택)
          </button>
        )}
      </section>

      {needsCleaning && (
        <section className="space-y-2">
          <p className="rounded-xl bg-[#FFF4DC] p-3 text-xs leading-5 text-[#A97822]">
            AI 판정 결과 청소가 필요해요.
            {startResult.cleanNotice &&
              ` ${startResult.cleanNotice}`}
          </p>

          <p className="text-xs font-bold text-[#24496B]">
            청소 후 사진 (필수)
          </p>

          {afterPhoto ? (
            <img
              src={afterPhoto.previewUrl}
              alt="청소 후 빗물받이"
              className="h-[190px] w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-[160px] items-center justify-center rounded-xl bg-[#F1F6FB]">
              <p className="text-xs text-[#8297AC]">
                청소 후 사진을 촬영해주세요.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              openPhotoStep('after')
            }
            className="w-full rounded-xl bg-[#EAF6FF] p-3 text-xs font-bold text-[#3489DC] disabled:opacity-40"
          >
            {afterPhoto
              ? '청소 후 사진 변경'
              : '청소 후 사진 등록'}{' '}
            (촬영/파일 선택)
          </button>
        </section>
      )}

      {!startResult && (
        <label className="block text-xs font-bold text-[#24496B]">
          점검 메모 (선택)

          <textarea
            value={note}
            maxLength={500}
            disabled={pending}
            onChange={(event) =>
              setNote(event.target.value)
            }
            placeholder="빗물받이 상태를 입력해주세요."
            className="mt-2 min-h-20 w-full rounded-xl border border-[#DCE8F1] p-3 text-xs"
          />
        </label>
      )}

      <label className="flex items-start gap-2 text-xs leading-relaxed text-[#607C99]">
        <input
          type="checkbox"
          checked={safetyConfirmed}
          disabled={pending}
          onChange={(event) =>
            setSafetyConfirmed(
              event.target.checked,
            )
          }
          required
          className="mt-0.5"
        />

        <span>
          안전수칙을 지켰고,
          사진에 얼굴이나 차량 번호판 등
          개인정보가 포함되지 않았음을 확인했어요.
        </span>
      </label>

      <button
        type="submit"
        disabled={
          pending ||
          !safetyConfirmed ||
          (
            needsCleaning
              ? !afterPhoto
              : !beforePhoto
          )
        }
        className="w-full rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {pending
          ? '사진 업로드 및 점검 제출 중...'
          : needsCleaning
            ? '청소 후 점검 완료하기'
            : '점검 전 사진으로 AI 판정받기'}
      </button>

      {(
        startMutation.isError ||
        completeMutation.isError
      ) && (
        <p
          role="alert"
          className="rounded-xl bg-[#FFF1F1] p-3 text-xs text-[#B84D4D]"
        >
          {getErrorMessage(
            startMutation.error ||
            completeMutation.error,
          )}
        </p>
      )}
    </form>
  )
}
