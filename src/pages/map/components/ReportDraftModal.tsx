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
import {
  createReport,
  getReportDetail,
  type ReportType,
} from '../../../apis/reports'

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
  { value: 'NEW_DRAIN', label: '신규 빗물받이' },
  { value: 'LOCATION_FIX', label: '위치 수정' },
  { value: 'REMOVAL', label: '삭제 요청' },
  { value: 'ODOR', label: '악취 제보' },
]

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE = 10 * 1024 * 1024

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

// 파일이 바뀌거나 컴포넌트가 사라지면 미리보기 URL을 해제해요.
function PhotoPreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    const url = URL.createObjectURL(file)

    if (image) {
      image.src = url
    }

    return () => {
      if (image) {
        image.removeAttribute('src')
      }

      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <img
      ref={imageRef}
      alt="첨부한 제보 사진"
      className="max-h-44 w-full rounded-xl object-contain"
    />
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
  const photoInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [type, setType] = useState<ReportType>('BLOCKAGE')
  const [drainId, setDrainId] = useState(
    initialDrainId?.toString() ?? '',
  )
  const [photo, setPhoto] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [newLatitude, setNewLatitude] = useState('')
  const [newLongitude, setNewLongitude] = useState('')
  const [formError, setFormError] = useState('')
  const [submittedReportId, setSubmittedReportId] =
    useState<number | null>(null)

  const isNewDrain = type === 'NEW_DRAIN'
  const isLocationFix = type === 'LOCATION_FIX'

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

  const mutation = useMutation({
    mutationFn: async () => {
      const description = note.trim()
      const coordinates = await getCurrentCoordinates()

      const photoKey = photo
        ? await uploadAdoptionPhoto(photo, 'REPORT')
        : undefined

      return createReport({
        ...(!isNewDrain ? { drainId: Number(drainId) } : {}),
        type,
        ...(photoKey ? { photoKey } : {}),
        ...(description ? { description } : {}),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        ...(isLocationFix
          ? {
              newLatitude: Number(newLatitude),
              newLongitude: Number(newLongitude),
            }
          : {}),
      })
    },
    
onSuccess: async (result) => {
  setSubmittedReportId(result.reportId)

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['map-drains'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['drain-detail'],
    }),
  ])
},

  })

  const handlePhotoChange = (file: File | null) => {
    if (!file) return

    setFormError('')
    mutation.reset()

    if (!PHOTO_TYPES.includes(file.type)) {
      setFormError('JPG, PNG, WEBP 사진만 업로드할 수 있어요.')
      return
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setFormError('사진은 10MB 이하여야 해요.')
      return
    }

    setPhoto(file)
  }

  const removePhoto = () => {
    setPhoto(null)
    setFormError('')
    mutation.reset()

    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
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

    if (mutation.isPending) return

    setFormError('')
    mutation.reset()

    if (
      !isNewDrain &&
      (!Number.isSafeInteger(Number(drainId)) ||
        Number(drainId) <= 0)
    ) {
      setFormError('제보할 빗물받이를 선택해 주세요.')
      return
    }

    if (type === 'REMOVAL' && !note.trim()) {
      setFormError('삭제 요청에는 사유가 필요해요.')
      return
    }

    if (!photo && !(type === 'ODOR' && note.trim())) {
      setFormError('사진을 첨부해 주세요.')
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
          '수정할 위치의 올바른 위도와 경도를 입력해 주세요.',
        )
        return
      }
    }

    if (!safetyConfirmed) {
      setFormError('안전 및 개인정보 확인이 필요해요.')
      return
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
                  {reportDetail.status === 'PENDING'
                    ? '검토 대기'
                    : reportDetail.status === 'APPROVED'
                      ? '승인 완료'
                      : '반려'}
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

              <p className="text-center text-xs text-[#8294A5]">
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
      busy={mutation.isPending}
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
              현장 사진과 함께 상태를 알려주세요.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
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
                disabled={mutation.isPending}
                onChange={(event) => {
                  setType(event.target.value as ReportType)
                  setFormError('')
                  mutation.reset()
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

            {!isNewDrain && (
              <div>
                <label
                  htmlFor="report-drain"
                  className={LABEL_CLASS}
                >
                  대상 빗물받이
                </label>
                <select
                  id="report-drain"
                  value={drainId}
                  disabled={mutation.isPending}
                  onChange={(event) =>
                    setDrainId(event.target.value)
                  }
                  className={FIELD_CLASS}
                >
                  <option value="">
                    빗물받이를 선택해 주세요
                  </option>
                  {drains.map((drain) => (
                    <option key={drain.id} value={drain.id}>
                      {drain.nickname ?? drain.name} (#{drain.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isNewDrain && (
              <p className="rounded-xl bg-[#EEF3FF] p-3 text-xs leading-5 text-[#637AA8]">
                신규 빗물받이는 현재 GPS 위치를 기준으로
                제보해요. 빗물받이 현장에서 제출해 주세요.
              </p>
            )}

            {isLocationFix && (
              <div className="space-y-3 rounded-xl bg-[#F4F6FB] p-3">
                <p className="text-xs font-bold text-[#304563]">
                  수정할 빗물받이 위치
                </p>

                <label className="block text-xs text-[#516A7D]">
                  새 위도
                  <input
                    type="number"
                    step="any"
                    value={newLatitude}
                    disabled={mutation.isPending}
                    onChange={(event) =>
                      setNewLatitude(event.target.value)
                    }
                    placeholder="예: 37.4884"
                    className={`mt-1 ${FIELD_CLASS}`}
                  />
                </label>

                <label className="block text-xs text-[#516A7D]">
                  새 경도
                  <input
                    type="number"
                    step="any"
                    value={newLongitude}
                    disabled={mutation.isPending}
                    onChange={(event) =>
                      setNewLongitude(event.target.value)
                    }
                    placeholder="예: 126.8042"
                    className={`mt-1 ${FIELD_CLASS}`}
                  />
                </label>

                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => void handleCurrentLocation()}
                  className="text-xs font-semibold text-[#6384EF] disabled:opacity-50"
                >
                  현재 위치 좌표 사용
                </button>
              </div>
            )}

            <div>
              <label
                htmlFor="report-photo"
                className={LABEL_CLASS}
              >
                제보 사진
              </label>

              <input
                ref={photoInputRef}
                id="report-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                disabled={mutation.isPending}
                onChange={(event) => {
                  handlePhotoChange(
                    event.currentTarget.files?.[0] ?? null,
                  )
                  event.currentTarget.value = ''
                }}
                className="sr-only"
                tabIndex={-1}
              />

              {photo ? (
                <div className="overflow-hidden rounded-2xl border border-[#DCE4F8] bg-[#F5F7FF] p-3">
                  <PhotoPreview file={photo} />

                  <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F6] pt-3">
                    <span
                      role="status"
                      className="text-xs font-medium text-[#637CE1]"
                    >
                      사진 첨부 완료
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={() =>
                          photoInputRef.current?.click()
                        }
                        className="text-xs font-semibold text-[#637CE1] disabled:opacity-50"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        disabled={mutation.isPending}
                        onClick={removePhoto}
                        className="text-xs font-medium text-[#8A96AA] disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => photoInputRef.current?.click()}
                  className="flex min-h-[108px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#BAC8F4] bg-[#F5F7FF] px-3 py-4 text-center transition hover:bg-[#EAF0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA2F5] disabled:opacity-50"
                >
                  <CameraIcon />
                  <span className="text-sm font-semibold text-[#637CE1]">
                    사진 촬영 또는 첨부
                  </span>
                  <span className="text-[10px] text-[#8592AC]">
                    JPG · PNG · WEBP / 최대 10MB
                  </span>
                </button>
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
                value={note}
                disabled={mutation.isPending}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="빗물받이의 상태를 설명해 주세요."
                className="block w-full resize-none rounded-xl border border-[#DFE5F0] bg-white px-3 py-3 text-sm leading-5 outline-none placeholder:text-[#9AA5B7] focus:border-[#7C93F2] focus:ring-2 focus:ring-[#EEF2FF]"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-[#F3F5FB] p-3">
              <input
                type="checkbox"
                checked={safetyConfirmed}
                disabled={mutation.isPending}
                onChange={(event) =>
                  setSafetyConfirmed(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#6D83E7]"
              />
              <span className="text-xs leading-5 text-[#516A7D]">
                안전한 장소에서 촬영했고 사진에 포함된
                개인정보를 확인했습니다.
              </span>
            </label>

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
            <p className="text-[10px] leading-relaxed text-[#8B9BAD]">
              제보는 관리자 검토 후 처리돼요. 경험치는
              승인된 경우에 지급됩니다.
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
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