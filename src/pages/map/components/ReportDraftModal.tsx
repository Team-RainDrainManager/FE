import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  getCurrentCoordinates,
  uploadAdoptionPhoto,
} from '../../../apis/adoptions'
import { getErrorMessage } from '../../../apis/auth'
import { AI_REQUEST_TIMEOUT_MS, apiClient } from '../../../apis/axios-instance'
import CameraCapture, { type CaptureMeta } from '../../../components/common/CameraCapture'
import CapturedPreview from '../../../components/common/camera/CapturedPreview'
import type { Coordinates } from '../../../components/common/camera/geo'
import { requestMotionPermission } from '../../../components/common/camera/motion'
import SafetyStart from '../../../components/common/camera/SafetyStart'
import {
  createReport,
  getReportDetail,
  type CreateReportRequest,
  type ReportStatus,
  type ReportType,
} from '../../../apis/reports'
import { gradeLabel } from '../../../utils/dirtGrade'
import SafetyReportLink from './SafetyReportLink'

type ReportDrainOption = {
  id: number
  name: string
  nickname: string | null
}

type Props = {
  drains: ReportDrainOption[]
  initialDrainId: number | null
  onClose: () => void
  onComplete: (reportId: number) => void
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'BLOCKAGE', label: '막힘 제보' },
  { value: 'LOCATION_FIX', label: '위치 수정' },
  { value: 'REMOVAL', label: '삭제 요청' },
  { value: 'ODOR', label: '악취 제보' },
]

const RESULT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '검토 대기',
  APPROVED: '승인 완료',
  REJECTED: '반려',
  CLEARED: '차단 해제',
}

type PhotoAssessment = {
  grade: number
  dirtLevel: number
  isRisk: boolean
  needsReport: boolean
  confidence: number
  reason: string
}

type AssessmentApiResponse = {
  success: boolean
  data: PhotoAssessment | null
  error: { code: string; message: string } | null
}

// 서버가 막힘 제보에 쓰는 '청소 불가' 기준과 같습니다. (BE ReportService: 막힘 등급 또는 신고 필요)
const GRADE_BLOCKED = 3
function isUncleanable(assessment: PhotoAssessment): boolean {
  return assessment.needsReport || assessment.grade >= GRADE_BLOCKED
}

// 사진 키만 전달해 AI 판독 결과를 미리 확인합니다. 이 요청만으로는 제보가 등록되지 않습니다.
async function assessPhoto(photoKey: string): Promise<PhotoAssessment> {
  const { data: response } = await apiClient.post<AssessmentApiResponse>(
    '/api/v1/drain/assessments',
    { photoKey },
    { timeout: AI_REQUEST_TIMEOUT_MS },
  )

  if (!response.success || !response.data) {
    throw new Error(response.error?.message ?? '사진 판독에 실패했어요.')
  }

  return response.data
}

const FIELD_CLASS =
  'h-11 w-full rounded-xl border border-[#DFE5F0] bg-white px-3 text-sm text-[#304563] outline-none transition focus:border-[#7C93F2] focus:ring-2 focus:ring-[#EEF2FF] disabled:opacity-60'

const LABEL_CLASS =
  'mb-2 block text-sm font-semibold text-[#304563]'

const BUTTON_CLASS =
  'min-h-11 w-full rounded-xl bg-[#6384EF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5476E3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6384EF] disabled:cursor-not-allowed disabled:opacity-50'

function ReportOverlay({
  children,
  onDismiss,
  busy = false,
}: {
  children: ReactNode
  onDismiss: () => void
  busy?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    if (dialog && !dialog.open) {
      dialog.showModal()
    }

    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="빗물받이 제보"
      className="fixed inset-0 m-auto max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-[#203451] outline-none backdrop:bg-[#182238]/55"
      onCancel={(event) => {
        event.preventDefault()

        if (!busy) {
          onDismiss()
        }
      }}
    >
      {children}
    </dialog>,
    document.body,
  )
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="text-[#6D83E7]"
    >
      <path d="M8 5 9.5 3h5L16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
}

export default function ReportDraftModal({
  drains,
  initialDrainId,
  onClose,
  onComplete,
}: Props) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<ReportType>('BLOCKAGE')
  // 지도에서 선택한 빗물받이 ID만 사용하며 모달에서는 변경할 수 없습니다.
  const selectedDrain = drains.find((drain) => drain.id === initialDrainId)
  const selectedDrainName = selectedDrain?.nickname ?? selectedDrain?.name
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoCoordinates, setPhotoCoordinates] =
    useState<Coordinates | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  // 판독용(AFTER)과 실제 제보용(REPORT)은 업로드 키를 분리합니다.
  const uploadedPhotoRef = useRef<{
    file: File
    keys: Partial<Record<'AFTER' | 'REPORT', string>>
  } | null>(null)
  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [newLatitude, setNewLatitude] = useState('')
  const [newLongitude, setNewLongitude] = useState('')
  const [formError, setFormError] = useState('')
  const [submittedReportId, setSubmittedReportId] =
    useState<number | null>(null)

  const isLocationFix = type === 'LOCATION_FIX'
  const isBlockage = type === 'BLOCKAGE'
  const isOdor = type === 'ODOR'
  const description = note.trim()

  const {
    data: reportDetail,
    isPending: detailPending,
    isError: detailIsError,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['report-detail', submittedReportId],
    queryFn: ({ signal }) => {
      if (submittedReportId === null) {
        throw new Error('제보 번호가 없어요.')
      }

      return getReportDetail(submittedReportId, signal)
    },
    enabled: submittedReportId !== null,
    retry: 1,
  })

  const finishReport = () => {
    if (submittedReportId !== null) {
      onComplete(submittedReportId)
    }
  }

  // 동일 사진 + 동일 업로드 용도의 키만 재사용합니다.
  const getPhotoKey = async (
    file: File,
    purpose: 'AFTER' | 'REPORT',
  ): Promise<string> => {
    if (uploadedPhotoRef.current?.file === file) {
      const existingKey = uploadedPhotoRef.current.keys[purpose]
      if (existingKey) return existingKey
    }

    const key = await uploadAdoptionPhoto(file, purpose)
    const keys = uploadedPhotoRef.current?.file === file
      ? uploadedPhotoRef.current.keys
      : {}

    uploadedPhotoRef.current = {
      file,
      keys: { ...keys, [purpose]: key },
    }
    return key
  }

  const assessmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const photoKey = await getPhotoKey(file, 'AFTER')
      return assessPhoto(photoKey)
    },
  })

  const assessment = isBlockage ? assessmentMutation.data : undefined
  const uncleanable = assessment ? isUncleanable(assessment) : false
  let submissionBlock = ''
  if (isOdor) {
    if (!photo && !description) {
      submissionBlock = '악취 사진을 찍거나 상세 내용을 입력해 주세요.'
    }
  } else if (!photo) {
    submissionBlock = '현장 사진을 찍어 주세요.'
  } else if (isBlockage && !uncleanable) {
    submissionBlock = assessment
      ? '직접 치울 수 있는 상태로 보여 막힘 제보로는 접수되지 않아요.'
      : 'AI 확인이 끝나면 제출할 수 있어요.'
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (submissionBlock) {
        throw new Error(submissionBlock)
      }

      const drainId = initialDrainId
      if (typeof drainId !== 'number' || !Number.isSafeInteger(drainId) || drainId <= 0) {
        throw new Error('선택한 빗물받이 ID를 확인할 수 없어요.')
      }

      const request: CreateReportRequest = {
        drainId,
        type,
        ...(description ? { description } : {}),
      }

      if (photo) {
        const coordinates = photoCoordinates ?? await getCurrentCoordinates()
        request.photoKey = await getPhotoKey(photo, 'REPORT')
        request.latitude = coordinates.latitude
        request.longitude = coordinates.longitude
      }

      if (isLocationFix) {
        request.newLatitude = Number(newLatitude)
        request.newLongitude = Number(newLongitude)
      }

      return createReport(request)
    },
    onSuccess: async (result) => {
      setSubmittedReportId(result.reportId)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
        queryClient.invalidateQueries({ queryKey: ['drain-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['reports', 'me'] }),
      ])
    },
  })

  const openCamera = () => {
    if (mutation.isPending || assessmentMutation.isPending) return
    void requestMotionPermission()
    setCameraOpen(true)
  }

  // 찍으면 바로 AI 판독으로 넘어갑니다.
  const handlePhotoChange = (file: File, meta: CaptureMeta) => {
    setCameraOpen(false)
    setFormError('')
    mutation.reset()
    uploadedPhotoRef.current = null
    setPhoto(file)
    setPhotoCoordinates(meta.coordinates)
    assessmentMutation.reset()
    if (isBlockage) assessmentMutation.mutate(file)
  }

  const removePhoto = () => {
    if (mutation.isPending || assessmentMutation.isPending) return
    uploadedPhotoRef.current = null
    assessmentMutation.reset()
    setPhoto(null)
    setPhotoCoordinates(null)
    setFormError('')
    mutation.reset()
  }

  const handleCurrentLocation = async () => {
    try {
      setFormError('')
      const position = await getCurrentCoordinates()

      setNewLatitude(String(position.latitude))
      setNewLongitude(String(position.longitude))
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (mutation.isPending || assessmentMutation.isPending) return

    setFormError('')
    mutation.reset()

    if (
      typeof initialDrainId !== 'number' ||
      !Number.isSafeInteger(initialDrainId) ||
      initialDrainId <= 0
    ) {
      setFormError('지도에서 제보할 빗물받이를 선택해 주세요.')
      return
    }

    if (type === 'REMOVAL' && !description) {
      setFormError('삭제 요청에는 사유가 필요해요.')
      return
    }

    if (submissionBlock) {
      setFormError(submissionBlock)
      return
    }

    if (isLocationFix) {
      const latitude = Number(newLatitude)
      const longitude = Number(newLongitude)

      if (
        !newLatitude.trim() ||
        !newLongitude.trim() ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        setFormError(
          '빗물받이 앞에 서서 새 위치를 먼저 정해 주세요.',
        )
        return
      }
    }

    mutation.mutate()
  }

  const errorMessage = mutation.isError
    ? getErrorMessage(mutation.error)
    : formError

  if (submittedReportId !== null) {
    return (
      <ReportOverlay onDismiss={finishReport}>
        <section
          aria-labelledby="report-result-title"
          className="max-h-[85dvh] w-[calc(100vw-40px)] max-w-[390px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl"
        >
          <h2
            id="report-result-title"
            className="text-center text-lg font-bold text-[#203451]"
          >
            제보 접수 결과
          </h2>

          {detailPending ? (
            <p
              role="status"
              className="py-8 text-center text-sm text-[#8294A5]"
            >
              접수된 제보를 확인하고 있어요.
            </p>
          ) : detailIsError ? (
            <div className="py-5 text-center">
              <p
                role="alert"
                className="text-sm leading-6 text-[#B84D4D]"
              >
                제보는 접수됐지만 상세 정보를 불러오지 못했어요.
              </p>
              <p className="mt-2 text-xs text-[#8294A5]">
                {getErrorMessage(detailError)}
              </p>
              <button
                type="button"
                onClick={() => void refetchDetail()}
                className="mt-4 text-sm font-bold text-[#6384EF]"
              >
                다시 조회
              </button>
            </div>
          ) : reportDetail ? (
            <div className="mt-5 space-y-4">
              <p className="text-center text-sm font-bold text-[#259B68]">
                {reportDetail.status === 'PENDING'
                  ? '제보가 접수됐어요!'
                  : '제보 정보를 확인했어요.'}
              </p>

              <div className="space-y-3 rounded-2xl bg-[#F4F6FB] p-4 text-sm leading-6 text-[#385A73]">
                <p>제보 번호: #{reportDetail.reportId}</p>
                <p>
                  접수 상태:{' '}
                  {RESULT_STATUS_LABELS[reportDetail.status] ?? '상태 확인 필요'}
                </p>
                <p>
                  접수 일시:{' '}
                  {new Date(reportDetail.createdAt).toLocaleString(
                    'ko-KR',
                  )}
                </p>

                {reportDetail.description && (
                  <p className="whitespace-pre-wrap break-words">
                    내용: {reportDetail.description}
                  </p>
                )}

                {reportDetail.adminComment && (
                  <p className="whitespace-pre-wrap break-words">
                    관리자 답변: {reportDetail.adminComment}
                  </p>
                )}
              </div>

              {reportDetail.photoUrl && (
                <img
                  src={reportDetail.photoUrl}
                  alt="접수된 제보 사진"
                  className="max-h-52 w-full rounded-xl object-contain"
                />
              )}

              {reportDetail.type === 'BLOCKAGE' && (
                <SafetyReportLink
                  reportId={reportDetail.reportId}
                  latitude={reportDetail.latitude}
                  longitude={reportDetail.longitude}
                  description={reportDetail.description}
                />
              )}

              <p className="text-center text-[13px] text-[#516A7D]">
                관리자 승인 후 경험치가 지급돼요.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={finishReport}
            className={`mt-5 ${BUTTON_CLASS}`}
          >
            확인
          </button>
        </section>
      </ReportOverlay>
    )
  }

  return (
    <ReportOverlay
      onDismiss={onClose}
      busy={mutation.isPending || assessmentMutation.isPending}
    >
      <section
        aria-labelledby="report-title"
        className="flex max-h-[85dvh] w-[calc(100vw-40px)] max-w-[390px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.22)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#EDF1F5] px-5 pb-4 pt-5">
          <div>
            <h2
              id="report-title"
              className="text-lg font-bold text-[#203451]"
            >
              빗물받이 제보
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#7F8DA5]">
              {isOdor
                ? '사진 또는 설명으로 악취를 제보할 수 있어요.'
                : '현장 사진과 함께 상태를 알려주세요.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending || assessmentMutation.isPending}
            aria-label="제보 창 닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4F6FA] text-xl text-[#7F8DA5] transition hover:bg-[#EAEFFA] focus-visible:outline-2 focus-visible:outline-[#6384EF] disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col"
        >
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div>
              <label
                htmlFor="report-type"
                className={LABEL_CLASS}
              >
                제보 종류
              </label>
              <select
                id="report-type"
                value={type}
                disabled={mutation.isPending || assessmentMutation.isPending}
                onChange={(event) => {
                  const nextType = event.target.value as ReportType
                  setType(nextType)
                  setFormError('')
                  mutation.reset()
                  if (nextType === 'BLOCKAGE' && photo && assessmentMutation.isIdle) {
                    assessmentMutation.mutate(photo)
                  }
                }}
                className={FIELD_CLASS}
              >
                {REPORT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 지도에서 선택한 빗물받이 정보를 읽기 전용으로 표시합니다. */}
            <div>
              <span className={LABEL_CLASS}>대상 빗물받이</span>
              <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#DFE5F0] bg-[#F4F6FB] px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#304563]">
                    {selectedDrainName || '선택한 빗물받이'}
                  </p>
                  
                </div>
              </div>
            </div>

            {isLocationFix && (
              <div className="space-y-2 rounded-xl bg-[#F4F6FB] p-3">
                <p className="text-sm font-bold text-[#304563]">
                  빗물받이의 실제 위치
                </p>
                <p className="text-[13px] leading-5 text-[#516A7D]">
                  빗물받이 바로 앞에 서서 아래 버튼을 눌러 주세요. 지금 서 있는 곳이 새 위치로 접수돼요.
                </p>

                <button
                  type="button"
                  disabled={mutation.isPending || assessmentMutation.isPending}
                  onClick={() => void handleCurrentLocation()}
                  className="min-h-11 w-full rounded-xl border border-[#6384EF] bg-white px-3 text-sm font-bold text-[#6384EF] disabled:opacity-50"
                >
                  {newLatitude && newLongitude ? '지금 위치로 다시 정하기' : '지금 서 있는 곳을 새 위치로 정하기'}
                </button>

                {newLatitude && newLongitude && (
                  <p role="status" className="text-[13px] font-semibold leading-5 text-[#247A4B]">
                    새 위치를 정했어요. (위도 {Number(newLatitude).toFixed(5)}, 경도 {Number(newLongitude).toFixed(5)})
                  </p>
                )}
              </div>
            )}

            <div>
              <span className={LABEL_CLASS}>
                {isOdor ? '제보 사진 (선택)' : '제보 사진'}
              </span>

              {cameraOpen && (
                <CameraCapture
                  title="제보 사진 촬영"
                  drainId={
                    // 위치 수정 제보는 등록된 위치와 멀리 있는 것이 정상입니다.
                    isLocationFix ? undefined : initialDrainId ?? undefined
                  }
                  enforceDistance={false}
                  onCapture={handlePhotoChange}
                  onCancel={() => setCameraOpen(false)}
                />
              )}

              {photo ? (
                <div className="overflow-hidden rounded-2xl border border-[#DCE4F8] bg-[#F5F7FF] p-3">
                  <CapturedPreview file={photo} alt="찍은 제보 사진" />

                  <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F6] pt-1">
                    <span
                      role="status"
                      className="text-xs font-medium text-[#637CE1]"
                    >
                      사진 촬영 완료
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={mutation.isPending || assessmentMutation.isPending}
                        onClick={openCamera}
                        className="min-h-11 px-2 text-[13px] font-semibold text-[#637CE1] disabled:opacity-50"
                      >
                        다시 찍기
                      </button>
                      <button
                        type="button"
                        disabled={mutation.isPending || assessmentMutation.isPending}
                        onClick={removePhoto}
                        className="min-h-11 px-2 text-[13px] font-medium text-[#516A7D] disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ) : !safetyConfirmed ? (
                <SafetyStart
                  disabled={mutation.isPending || assessmentMutation.isPending}
                  onStart={() => {
                    setSafetyConfirmed(true)
                    setCameraOpen(true)
                  }}
                />
              ) : (
                <button
                  type="button"
                  disabled={mutation.isPending || assessmentMutation.isPending}
                  onClick={openCamera}
                  className="flex min-h-[108px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#BAC8F4] bg-[#F5F7FF] px-3 py-4 text-center transition hover:bg-[#EAF0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA2F5] disabled:opacity-50"
                >
                  <CameraIcon />
                  <span className="text-sm font-semibold text-[#637CE1]">
                    사진 촬영
                  </span>
                </button>
              )}

              {/* 막힘 제보만 AI가 '직접 치우기 어려운 막힘'으로 확인해야 접수됩니다. (서버 규칙과 같음) */}
              {isBlockage && assessmentMutation.isPending && (
                <p
                  role="status"
                  className="mt-3 animate-pulse rounded-xl bg-[#F5F7FF] p-3 text-center text-sm font-semibold text-[#3855B8]"
                >
                  AI가 사진을 확인하고 있어요. 길면 1분쯤 걸려요.
                </p>
              )}

              {isBlockage && assessmentMutation.isError && photo && (
                <>
                  <p role="alert" className="mt-3 rounded-xl bg-[#FFF1F1] p-3 text-sm leading-relaxed text-[#B84D4D]">
                    {getErrorMessage(assessmentMutation.error)}
                  </p>
                  <button
                    type="button"
                    onClick={() => assessmentMutation.mutate(photo)}
                    disabled={mutation.isPending}
                    className="mt-2 min-h-11 w-full rounded-xl border border-[#6384EF] bg-white px-4 py-3 text-sm font-bold text-[#6384EF] transition hover:bg-[#F5F7FF] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    AI 확인 다시 하기
                  </button>
                </>
              )}

              {assessment && (
                <div role="status" className="mt-3 space-y-2 rounded-xl border border-[#DCE4F8] bg-[#F5F7FF] p-3 text-sm leading-6 text-[#304563]">
                  <p className="font-bold text-[#3855B8]">
                    AI 확인 결과: {gradeLabel(assessment.grade)}
                  </p>
                  {assessment.reason?.trim() && (
                    <p className="whitespace-pre-wrap break-words">{assessment.reason}</p>
                  )}
                  <p
                    className={`rounded-lg p-2.5 text-[13px] font-semibold leading-5 ${
                      uncleanable
                        ? 'bg-[#EAF7EF] text-[#247A4B]'
                        : 'bg-[#FFF4DC] text-[#8A6510]'
                    }`}
                  >
                    {uncleanable
                      ? '직접 치우기 어려운 막힘으로 확인됐어요. 아래에서 제보를 제출해 주세요.'
                      : '직접 치울 수 있는 상태로 보여요. 막힘 제보는 덮개 틈 안쪽까지 막혀 치울 수 없을 때만 접수돼요. 치울 수 있다면 입양하거나 점검으로 기록해 주세요.'}
                  </p>
                  {!uncleanable && (
                    <p className="text-[13px] leading-5 text-[#516A7D]">
                      사진이 잘못 찍혔다면 다시 찍어 주세요. 악취나 위치 문제는 제보 종류를 바꿔 접수할 수 있어요.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="report-note"
                className={LABEL_CLASS}
              >
                상세 내용
              </label>
              <textarea
                id="report-note"
                rows={3}
                maxLength={1000}
                value={note}
                disabled={mutation.isPending || assessmentMutation.isPending}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="빗물받이의 상태를 설명해 주세요."
                className="block w-full resize-none rounded-xl border border-[#DFE5F0] bg-white px-3 py-3 text-sm leading-5 outline-none placeholder:text-[#9AA5B7] focus:border-[#7C93F2] focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl bg-[#FFF1F1] p-3 text-xs leading-5 text-[#B84D4D]"
              >
                {errorMessage}
              </p>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-[#EDF1F5] bg-white px-5 pb-5 pt-3">
            
            {submissionBlock && !assessmentMutation.isPending && (
              <p className="text-center text-[13px] leading-5 text-[#516A7D]">
                {submissionBlock}
              </p>
            )}
            <button
              type="submit"
              disabled={Boolean(submissionBlock) || mutation.isPending || assessmentMutation.isPending}
              className={BUTTON_CLASS}
            >
              {mutation.isPending
                ? '제보 접수 중...'
                : '제보 제출하기'}
            </button>
          </div>
        </form>
      </section>
    </ReportOverlay>
  )
}
