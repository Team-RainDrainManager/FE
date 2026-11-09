import { useContext, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AccountId, award } from '../../../features/missions/wallet'
import {
  clearDraft,
  flowDraftKey,
  loadDraft,
  loadDraftPhoto,
  saveDraft,
} from '../../../features/flow-draft/flow-draft'
import {
  getCurrentCoordinates,
  uploadAdoptionPhoto,
} from '../../../apis/adoptions'
import { getErrorMessage } from '../../../apis/auth'
import { gradeLabel } from '../../../utils/dirtGrade'
import {
  completeInspection,
  getInspectionEligibility,
  getInspectionEligibilityMessage,
  startInspection,
  type InspectionSubmitResponse,
} from '../../../apis/inspections'
import CameraCapture, { type CaptureMeta } from '../../../components/common/CameraCapture'
import type { Box } from '../../../components/common/camera/box'
import { CAMERA } from '../../../components/common/camera/config'
import type { Coordinates } from '../../../components/common/camera/geo'
import { isPhotoStale, STALE_PHOTO_MESSAGE } from '../../../components/common/camera/image'
import { requestMotionPermission } from '../../../components/common/camera/motion'
import PhotoSubmitStatus from '../../../components/common/camera/PhotoSubmitStatus'
import SafetyStart from '../../../components/common/camera/SafetyStart'

// 창을 닫아도 이어서 하도록 남기는 값입니다. 비 예보·대신 점검은 같은 요청으로 점검을 다시 시작할 수 없어서
// 청소가 필요하다는 판정(점검 번호)을 잃으면 끝낼 방법이 없습니다.
type InspectionDraft = {
  startResult: InspectionSubmitResponse | null
  note: string
  safetyConfirmed: boolean
  beforeBox: Box | null
}

type SubmitPhoto = {
  photo: File
  /** 찍을 때의 위치. null이면 보낼 때 다시 잽니다. */
  coordinates: Coordinates | null
}

type Props = {
  drainId: number
  requestId?: number
  kind: 'ROUTINE' | 'FORECAST' | 'SUBSTITUTE'
  adoptionName: string
  onCancel: () => void
}

const AI_WAIT_NOTE = '길면 1분쯤 걸려요.'

function pendingReason(result: InspectionSubmitResponse) {
  if (result.distanceM !== null && result.distanceM > CAMERA.locationLimitM) {
    return `빗물받이에서 ${result.distanceM}m 떨어진 곳에서 찍혔어요. ${CAMERA.locationLimitM}m 안에서 다시 점검하면 바로 결과가 나와요.`
  }
  return 'AI 판정이 확실하지 않아 담당자 확인이 필요해요. 덮개가 잘 보이게 다시 찍어 점검할 수 있어요.'
}

function ResultMessage({
  result,
  onClose,
}: {
  result: InspectionSubmitResponse
  onClose: () => void
}) {
  const isCompleted = result.status === 'COMPLETED'
  const isPending = result.status === 'PENDING'
  const aiGrade = result.afterGrade ?? result.beforeGrade

  const message = {
    COMPLETED: '점검이 완료됐어요!',
    PENDING: '점검 결과를 검토 중이에요.',
    REJECTED: '점검 인증이 반려됐어요.',
    NEEDS_CLEANING: '청소 후 사진이 필요해요.',
  }[result.status]

  return (
    <div
      role="status"
      className={`space-y-3 rounded-xl p-5 text-center text-sm ${isPending ? 'bg-[#FFF4E3] text-[#956222]' : 'bg-[#E8F7EF] text-[#259B68]'}`}
    >
      <p className="font-bold">{message}</p>

      {isPending && (
        <>
          <p className="text-xs leading-relaxed">{pendingReason(result)}</p>
          {aiGrade !== null && <p className="text-xs font-bold">AI 판정: {gradeLabel(aiGrade)}</p>}
        </>
      )}

      {isCompleted && (
        <p className="text-base font-bold">
          +{result.xpAwarded} XP
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className={`mt-3 rounded-full bg-white px-5 py-2 text-xs font-bold ${isPending ? 'text-[#956222]' : 'text-[#259B68]'}`}
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
  const account = useContext(AccountId)
  const queryClient = useQueryClient()

  const draftKey = flowDraftKey('inspection', account, drainId, kind, requestId)
  const [draft] = useState(() => loadDraft<InspectionDraft>(draftKey))

  const [camera, setCamera] = useState<'before' | 'after' | null>(null)

  const [beforePhoto, setBeforePhoto] =
    useState<File | null>(() => loadDraftPhoto(draftKey, 'before'))
  const [beforeBox, setBeforeBox] =
    useState<Box | null>(draft?.beforeBox ?? null)

  const [afterPhoto, setAfterPhoto] =
    useState<File | null>(() => loadDraftPhoto(draftKey, 'after'))

  const [note, setNote] = useState(draft?.note ?? '')
  const [safetyConfirmed, setSafetyConfirmed] =
    useState(draft?.safetyConfirmed ?? false)

  const [startResult, setStartResult] =
    useState<InspectionSubmitResponse | null>(draft?.startResult ?? null)

  const [finalResult, setFinalResult] =
    useState<InspectionSubmitResponse | null>(null)

  const [stalePhoto, setStalePhoto] = useState(false)

  // 새로고침으로 사진만 사라지고 남은 것이 없으면 이어서 할 것이 없습니다.
  const [resumed, setResumed] = useState(
    draft !== null &&
      (draft.startResult !== null || beforePhoto !== null || draft.note.trim() !== ''),
  )

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
    mutationFn: async ({ photo, coordinates }: SubmitPhoto) => {
      // 서버는 제출 시에도 재검증하지만, 먼저 확인해 불필요한 업로드 방지
      const latestEligibility = await getInspectionEligibility(
        drainId,
        eligibilityRequestId,
      )
      if (!latestEligibility.eligible) {
        throw new Error(getInspectionEligibilityMessage(latestEligibility))
      }

      // 찍을 때의 위치가 없으면 지금 위치를 확인
      const { latitude, longitude } =
        coordinates ?? await getCurrentCoordinates()

      // 점검 전 사진 업로드
      const beforeKey = await uploadAdoptionPhoto(
        photo,
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
  capturedAt: new Date(photo.lastModified).toISOString(),
  ...(note.trim() ? { note: note.trim() } : {}),
  safetyConfirmed: true,
})
    },

    onSuccess: async (result, { photo }) => {
      if (result.status === 'COMPLETED' && kind === 'SUBSTITUTE') {
        void award(account, 'substitute').catch(console.error)
      }
      setStartResult(result)
      setResumed(false)

      if (result.status === 'NEEDS_CLEANING') {
        // 판정을 기다리다 창을 닫았어도 점검 번호가 남도록 바로 저장합니다.
        saveDraft<InspectionDraft>(
          draftKey,
          { startResult: result, note, safetyConfirmed, beforeBox },
          { before: photo, after: null },
        )
      } else {
        // COMPLETED / PENDING / REJECTED
        clearDraft(draftKey)
        setFinalResult(result)
        await refreshData()
      }
    },
  })

  // 2단계: 청소 후 사진 제출
  const completeMutation = useMutation({
    mutationFn: async ({ photo }: SubmitPhoto) => {
      if (!startResult) {
        throw new Error('점검 정보를 찾지 못했어요. 처음부터 다시 해 주세요.')
      }

      const afterKey = await uploadAdoptionPhoto(
        photo,
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
      setResumed(false)

      // 청소가 아직 부족하면 같은 점검에 다시 찍어 올립니다.
      if (result.status === 'NEEDS_CLEANING') {
        setStartResult(result)
        setAfterPhoto(null)
        saveDraft<InspectionDraft>(
          draftKey,
          { startResult: result, note, safetyConfirmed, beforeBox },
          { before: beforePhoto, after: null },
        )
        return
      }

      if (result.status === 'COMPLETED' && kind !== 'FORECAST') {
        void award(account, kind === 'SUBSTITUTE' ? 'substitute' : 'clean').catch(console.error)
      }
      clearDraft(draftKey)
      setFinalResult(result)
      await refreshData()
    },
  })

  // 진행 상황 저장. 결과가 나오면 지웁니다.
  useEffect(() => {
    if (
      finalResult ||
      (!startResult && !beforePhoto && !note.trim() && !safetyConfirmed)
    ) {
      clearDraft(draftKey)
      return
    }
    saveDraft<InspectionDraft>(
      draftKey,
      { startResult, note, safetyConfirmed, beforeBox },
      { before: beforePhoto, after: afterPhoto },
    )
  }, [
    draftKey,
    finalResult,
    startResult,
    beforePhoto,
    beforeBox,
    afterPhoto,
    note,
    safetyConfirmed,
  ])

  // 찍으면 바로 AI 판정으로 넘어갑니다.
  const handleCapture = (file: File, meta: CaptureMeta) => {
    const step = camera
    setCamera(null)

    if (step === 'before') {
      setBeforePhoto(file)
      setBeforeBox(meta.box)
      startMutation.mutate({ photo: file, coordinates: meta.coordinates })
    } else if (step === 'after') {
      setAfterPhoto(file)
      completeMutation.mutate({ photo: file, coordinates: meta.coordinates })
    }
  }

  const openCamera = (step: 'before' | 'after') => {
    // 아이폰 센서 권한은 버튼을 누른 순간에만 물을 수 있습니다.
    void requestMotionPermission()
    startMutation.reset()
    completeMutation.reset()
    setStalePhoto(false)
    setCamera(step)
  }

  const restart = () => {
    clearDraft(draftKey)
    startMutation.reset()
    completeMutation.reset()
    setStartResult(null)
    setBeforePhoto(null)
    setBeforeBox(null)
    setAfterPhoto(null)
    setNote('')
    setSafetyConfirmed(false)
    setResumed(false)
  }

  const pending =
    startMutation.isPending ||
    completeMutation.isPending

  // 비 예보·대신 점검은 시작한 점검을 다시 시작할 수 없어서, 실패했을 때만 처음부터 하게 합니다.
  const canRestart =
    resumed &&
    !pending &&
    (!startResult || kind === 'ROUTINE' || completeMutation.isError)

  const header = (
    <div>
      <h3 className="text-sm font-bold text-[#24496B]">
        {adoptionName}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[#3981F7]">
        {kind === 'ROUTINE'
          ? '일반 정기 점검'
          : kind === 'SUBSTITUTE'
            ? '대신 점검'
            : '비 예보 점검'}

        {requestId !== undefined && (
          <> · 요청 #{requestId}</>
        )}
      </p>
    </div>
  )

  const resumeNotice = resumed && (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F4F7FC] p-3 text-xs text-[#3E5670]">
      <span>하던 점검을 이어서 진행해요.</span>
      {canRestart && (
        <button
          type="button"
          onClick={restart}
          className="shrink-0 font-bold text-[#3489DC] underline"
        >
          처음부터 다시
        </button>
      )}
    </div>
  )

  const submitError = (startMutation.isError || completeMutation.isError || stalePhoto) && (
    <p
      role="alert"
      className="rounded-xl bg-[#FFF1F1] p-3 text-sm leading-relaxed text-[#B84D4D]"
    >
      {stalePhoto
        ? STALE_PHOTO_MESSAGE
        : getErrorMessage(startMutation.error || completeMutation.error)}
    </p>
  )

  // 자격 확인 전에는 카메라·사진 업로드를 진행하지 않음
  if (!eligibilityEnabled) {
    return (
      <div role="alert" className="space-y-3 rounded-xl bg-[#FFF4DC] p-4 text-xs text-[#956222]">
        <p>점검할 빗물받이 또는 비 예보 요청 정보가 올바르지 않아요.</p>
        <button type="button" onClick={onCancel} className="font-bold underline">닫기</button>
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

  // 카메라 화면
  if (camera) {
    return (
      <CameraCapture
        title={camera === 'before' ? '점검 전 사진 촬영' : '청소 후 사진 촬영'}
        drainId={drainId}
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

  // 청소 후 사진 단계
  if (startResult) {
    return (
      <div className="space-y-4">
        {header}
        {resumeNotice}

        {needsCleaning && (
          <p className="rounded-xl bg-[#FFF4DC] p-3 text-sm leading-relaxed text-[#7A5310]">
            {startResult.cleanNotice ?? 'AI 판정 결과 청소가 필요해요.'}
          </p>
        )}

        {submitError}

        {afterPhoto ? (
          <PhotoSubmitStatus
            file={afterPhoto}
            alt="청소 후 빗물받이"
            busy={completeMutation.isPending}
            busyText={`청소가 잘 됐는지 AI가 확인하고 있어요. ${AI_WAIT_NOTE}`}
            retryLabel="다시 인증받기"
            onRetake={() => openCamera('after')}
            onRetry={() => {
              if (isPhotoStale(afterPhoto)) {
                completeMutation.reset()
                setAfterPhoto(null)
                setStalePhoto(true)
                return
              }
              completeMutation.mutate({ photo: afterPhoto, coordinates: null })
            }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => openCamera('after')}
              className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white"
            >
              청소 후 사진 찍기
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-[#DCE8F1] bg-white p-3 text-sm font-semibold text-[#3E5670]"
            >
              청소하고 나서 이어서 하기
            </button>
          </>
        )}
      </div>
    )
  }

  if ((eligibilityPending || eligibilityFetching)) {
    return <p role="status" className="py-5 text-center text-xs text-[#78899F]">점검 가능 여부를 확인하고 있어요.</p>
  }

  if (eligibilityError || !eligibility) {
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

  if (!eligibility.eligible) {
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

  // 점검 전 사진 단계
  return (
    <div className="space-y-4">
      {header}
      {resumeNotice}
      {submitError}

      {beforePhoto ? (
        <PhotoSubmitStatus
          file={beforePhoto}
          alt="점검 전 빗물받이"
          busy={startMutation.isPending}
          busyText={`AI가 사진을 확인하고 있어요. ${AI_WAIT_NOTE}`}
          retryLabel="다시 판정받기"
          onRetake={() => openCamera('before')}
          onRetry={() => {
            if (isPhotoStale(beforePhoto)) {
              startMutation.reset()
              setBeforePhoto(null)
              setStalePhoto(true)
              return
            }
            startMutation.mutate({ photo: beforePhoto, coordinates: null })
          }}
        />
      ) : (
        <>
          <label className="block text-xs font-bold text-[#24496B]">
            점검 메모 (선택)

            <textarea
              value={note}
              maxLength={500}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="빗물받이 상태를 입력해주세요."
              className="mt-2 min-h-16 w-full rounded-xl border border-[#DCE8F1] p-3 text-sm font-normal"
            />
          </label>

          {safetyConfirmed ? (
            <button
              type="button"
              onClick={() => openCamera('before')}
              className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white"
            >
              카메라로 촬영하기
            </button>
          ) : (
            <SafetyStart
              onStart={() => {
                setSafetyConfirmed(true)
                setCamera('before')
              }}
            />
          )}

          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full border border-[#DCE8F1] bg-white p-3 text-sm font-semibold text-[#3E5670]"
          >
            점검 취소
          </button>
        </>
      )}
    </div>
  )
}
