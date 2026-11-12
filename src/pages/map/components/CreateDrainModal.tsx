
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  getCurrentCoordinates,
  uploadAdoptionPhoto,
} from '../../../apis/adoptions'
import { getErrorMessage } from '../../../apis/auth'
import {
  createDrain,
  type DrainCreateResponse,
} from '../../../apis/drains'
import CameraCapture, { type CaptureMeta } from '../../../components/common/CameraCapture'
import CapturedPreview from '../../../components/common/camera/CapturedPreview'
import type { Coordinates } from '../../../components/common/camera/geo'
import { requestMotionPermission } from '../../../components/common/camera/motion'
import SafetyStart from '../../../components/common/camera/SafetyStart'
import { dirtLevelLabel } from '../../../utils/dirtGrade'

interface Props {
  /** 운영자가 지도에서 고른 등록 지점(지도 가운데). 일반 사용자는 null이라 GPS 위치로만 등록합니다. */
  mapCenter?: { latitude: number; longitude: number } | null
  onClose: () => void
  onViewDetail: (drainId: number) => void
}

type SubmitStage =
  | 'idle'
  | 'location'
  | 'upload'
  | 'create'

const INPUT =
  'w-full rounded-xl border border-[#DCE4EE] bg-white px-3 py-3 text-sm text-[#203451] outline-none focus:border-[#3981F7] focus:ring-2 focus:ring-[#EAF2FF] disabled:opacity-60'

const LABEL =
  'mb-1.5 block text-sm font-semibold text-[#304563]'

export default function CreateDrainModal({
  mapCenter = null,
  onClose,
  onViewDetail,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const uploadedRef = useRef<{
    file: File
    key: string
  } | null>(null)

  const queryClient = useQueryClient()

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoCoordinates, setPhotoCoordinates] =
    useState<Coordinates | null>(null)
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [name, setName] = useState('')
  // 운영자만 고를 수 있습니다. 기본은 사진을 찍은 곳(GPS)입니다.
  const [useMapCenter, setUseMapCenter] = useState(false)
  const pickedLocation = useMapCenter ? mapCenter : null
  const [formError, setFormError] = useState('')
  const [stage, setStage] =
    useState<SubmitStage>('idle')

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow =
      document.body.style.overflow
    const previousFocus = document.activeElement

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

  const mutation = useMutation({
    mutationFn: async (): Promise<DrainCreateResponse> => {
      if (!photo) {
        throw new Error(
          '빗물받이 사진을 첨부해 주세요.',
        )
      }

      const trimmedName = name.trim()

      if (!trimmedName || trimmedName.length > 50) {
        throw new Error(
          '빗물받이 이름을 1~50자로 입력해 주세요.',
        )
      }

      // 1. 찍을 때의 위치가 없으면 지금 GPS 조회
      setStage('location')

      const { latitude, longitude } =
        pickedLocation ?? photoCoordinates ?? await getCurrentCoordinates()

      // 2. 사진 S3 업로드
      // 같은 사진으로 재시도하면 기존 키 재사용
      setStage('upload')

      let photoKey: string

      if (uploadedRef.current?.file === photo) {
        photoKey = uploadedRef.current.key
      } else {
        photoKey = await uploadAdoptionPhoto(
          photo,
          'DRAIN',
        )

        uploadedRef.current = {
          file: photo,
          key: photoKey,
        }
      }

      // 3. 빗물받이 생성 API 호출
      setStage('create')

      return createDrain({
        latitude,
        longitude,
        photoKey,
        name: trimmedName,
        address: '',
        isRisk: false,
        riskDescription: '',
      })
    },

    onSuccess: async (result) => {
      // 등록 후 지도 데이터 갱신
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['map-drains'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['drain-detail', result.id],
        }),
      ])
    },

    onSettled: () => {
      setStage('idle')
    },
  })

  const busy = mutation.isPending
  const result = mutation.data

  const handlePhoto = (file: File, meta: CaptureMeta) => {
    uploadedRef.current = null
    setPhoto(file)
    setPhotoCoordinates(meta.coordinates)
    setCameraOpen(false)
    setFormError('')
    mutation.reset()
  }

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (busy || cameraOpen) return

    setFormError('')

    if (!photo) {
      setFormError(
        '빗물받이 사진을 첨부해 주세요.',
      )
      return
    }

    if (!name.trim() || name.trim().length > 50) {
      setFormError(
        '빗물받이 이름을 1~50자로 입력해 주세요.',
      )
      return
    }

    mutation.mutate()
  }

  const submitText = busy
    ? stage === 'location'
      ? '현재 위치 확인 중...'
      : stage === 'upload'
        ? '사진 업로드 중...'
        : '빗물받이 등록 중...'
    : '빗물받이 등록하기'

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="빗물받이 등록"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className="fixed inset-0 m-auto max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-[#203451] outline-none backdrop:bg-[#182238]/55"
    >
      <section
        aria-labelledby="create-drain-title"
        className="flex max-h-[88dvh] w-[calc(100vw-32px)] max-w-[420px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#EDF1F5] px-5 py-4">
          <div>
            <h2
              id="create-drain-title"
              className="text-lg font-bold text-[#203451]"
            >
              빗물받이 등록
            </h2>

            <p className="mt-1 text-xs text-[#8294A5]">
              사진과 이름만 입력하면 위치를 자동 확인해요.
            </p>
          </div>

          <button
            type="button"
            aria-label="등록 창 닫기"
            onClick={onClose}
            disabled={busy}
            className="rounded-full bg-[#F2F6FA] px-3 py-1.5 text-xl text-[#647C8E] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* 등록 성공 화면 */}
        {result ? (
          <div className="space-y-4 overflow-y-auto p-5">
            <p
              role="status"
              className="text-center text-base font-bold text-[#259B68]"
            >
              빗물받이 등록이 완료됐어요!
            </p>

            {result.adoptionBlocked === true && (
              <div className="rounded-2xl border border-[#F2DEB3] bg-[#FFF6E4] p-3 text-[#795015]">
                <p className="text-sm font-bold">현재 입양이 제한돼요</p>
                <p className="mt-1 text-xs leading-5">
                  사진 판독에서 청소하기 어려운 상태로 확인됐어요.
                </p>
              </div>
            )}

            <div className="space-y-2 rounded-2xl bg-[#F4F7FB] p-4 text-sm text-[#385A73]">
              <p>
                이름:{' '}
                {result.name ||
                  `빗물받이 #${result.id}`}
              </p>

              <p>번호: #{result.id}</p>

              <p>
                상태:{' '}
                {result.displayStatusLabel ||
                  result.displayStatus}
              </p>

              <p>
                오염도: {dirtLevelLabel(result.dirtLevel)}
              </p>

              <p>
                위험 여부:{' '}
                {result.isRisk
                  ? '위험'
                  : '위험 없음'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onViewDetail(result.id)}
              className="min-h-11 w-full rounded-xl bg-[#3981F7] p-3 text-sm font-bold text-white"
            >
              등록한 빗물받이 상세 보기
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-10 w-full rounded-xl bg-[#F2F6FA] p-3 text-sm font-semibold text-[#53647E]"
            >
              지도로 돌아가기
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-col"
          >
            <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              {/* 사진 촬영 */}
              {cameraOpen && (
                <CameraCapture
                  title="빗물받이 현장 촬영"
                  onCapture={handlePhoto}
                  onCancel={() =>
                    setCameraOpen(false)
                  }
                />
              )}

              <div>
                <span className={LABEL}>
                  빗물받이 사진 *
                </span>

                {photo && (
                  <div className="mb-2 rounded-2xl bg-[#F4F7FB] p-3">
                    <CapturedPreview
                      file={photo}
                      alt="등록할 빗물받이 사진"
                    />
                  </div>
                )}

                {safetyConfirmed ? (
                  <button
                    type="button"
                    onClick={() => {
                      void requestMotionPermission()
                      setCameraOpen(true)
                    }}
                    disabled={busy}
                    className="min-h-11 w-full rounded-xl border border-[#C5D8F2] bg-[#F4F8FF] px-2 text-sm font-semibold text-[#3981F7] disabled:opacity-50"
                  >
                    {photo ? '사진 다시 찍기' : '사진 촬영'}
                  </button>
                ) : (
                  <SafetyStart
                    disabled={busy}
                    onStart={() => {
                      setSafetyConfirmed(true)
                      setCameraOpen(true)
                    }}
                  />
                )}
              </div>

              {/* 이름 입력 */}
              <div>
                <label
                  className={LABEL}
                  htmlFor="create-drain-name"
                >
                  빗물받이 이름 * (최대 50자)
                </label>

                <input
                  id="create-drain-name"
                  value={name}
                  maxLength={50}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFormError('')
                  }}
                  placeholder="예: 학교 정문 앞 빗물받이"
                  disabled={busy}
                  required
                  className={INPUT}
                />
              </div>

              {/* 등록 위치: 운영자는 지도 가운데 지점을 고를 수 있음 */}
              {mapCenter && (
                <fieldset className="rounded-xl border border-[#DCE4EE] p-3">
                  <legend className="px-1 text-sm font-semibold text-[#304563]">등록 위치 (운영자)</legend>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-[#203451]">
                    <input type="radio" name="create-drain-location" checked={!useMapCenter} disabled={busy} onChange={() => setUseMapCenter(false)} className="h-4 w-4 shrink-0" />
                    사진을 찍은 곳 (GPS)
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-[#203451]">
                    <input type="radio" name="create-drain-location" checked={useMapCenter} disabled={busy} onChange={() => setUseMapCenter(true)} className="h-4 w-4 shrink-0" />
                    <span>지도 가운데 지점 <span className="text-[13px] text-[#53647E]">({mapCenter.latitude.toFixed(5)}, {mapCenter.longitude.toFixed(5)})</span></span>
                  </label>
                </fieldset>
              )}

              {/* GPS 안내 */}
              <p className="rounded-xl bg-[#F4F7FB] p-3 text-xs leading-5 text-[#53647E]">
                {pickedLocation
                  ? '지도 가운데에 표시된 지점으로 등록해요. 지도를 움직여 위치를 맞춘 뒤 다시 열면 지점이 바뀌어요.'
                  : '사진을 찍은 곳의 GPS 위치로 등록해요. 위치 권한을 허용해 주세요.'}
              </p>

              {/* 오류 표시 */}
              {(formError || mutation.isError) && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FFF1F1] p-3 text-xs leading-5 text-[#B84D4D]"
                >
                  {formError ||
                    getErrorMessage(mutation.error)}
                </p>
              )}

              <p className="text-xs leading-5 text-[#8294A5]">
                이미 등록된 빗물받이는 중복으로
                등록하지 말아 주세요. 서버 요청이
                실패했다면 재시도 전에 지도에서
                등록 여부를 확인해 주세요.
              </p>
            </div>

            {/* 등록 버튼 */}
            <div className="shrink-0 border-t border-[#EDF1F5] bg-white p-4">
              <button
                type="submit"
                disabled={busy || cameraOpen}
                className="min-h-12 w-full rounded-xl bg-[#3981F7] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitText}
              </button>
            </div>
          </form>
        )}
      </section>
    </dialog>,
    document.body,
  )
}
