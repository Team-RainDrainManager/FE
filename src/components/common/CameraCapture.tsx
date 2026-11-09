import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'

import { getAdoptionDrainDetail } from '../../apis/adoptions'
import { AccountId, award } from '../../features/missions/wallet'
import BoxEditor from './camera/BoxEditor'
import { cropWithBox, type Box } from './camera/box'
import { CAMERA } from './camera/config'
import { distanceMeters, distanceText, type Coordinates } from './camera/geo'
import { canvasToJpeg } from './camera/image'
import LiveCamera, { type CameraReference, type Captured } from './camera/LiveCamera'
import { assessPhoto } from './camera/quality'

/** 사진과 함께 넘겨주는 정보입니다. */
export type CaptureMeta = {
  takenAt: number
  /** 찍을 때의 위치. null이면 보낼 때 getCurrentCoordinates()로 다시 재 주세요. */
  coordinates: Coordinates | null
  /** 맞춘 빨간 박스. 청소 후 촬영의 reference로 넘기면 같은 구도로 찍을 수 있습니다. */
  box: Box
}

type Props = {
  title: string
  /** 빨간 박스와 주변만 잘라 박스 선을 그린 사진을 받습니다. 서버로 보내는 사진이 이것입니다. */
  onCapture: (file: File, meta: CaptureMeta) => void
  onCancel: () => void
  /** 찍을 빗물받이. 주면 거리를 보여 주고 너무 멀면 미리 알려 줍니다. */
  drainId?: number
  /** 서버가 멀리서 찍은 사진을 거절하는 흐름인지. 제보처럼 거리 제한이 없으면 false로 주세요. */
  enforceDistance?: boolean
  /** 청소 전 사진. 주면 반투명하게 겹쳐 같은 구도로 찍게 합니다. */
  reference?: CameraReference | null
}

type Shot = {
  canvas: HTMLCanvasElement
  url: string
  takenAt: number
  coordinates: Coordinates | null
  warning: string
}

function qualityWarning(canvas: HTMLCanvasElement, box: Box): string {
  const rules = CAMERA.quality
  const { sharpness, brightness } = assessPhoto(
    canvas,
    canvas.width,
    canvas.height,
    box,
    rules.analysisWidth,
  )
  if (sharpness < rules.minSharpness) return '사진이 흐릴 수 있어요. 가능하면 다시 찍어 주세요.'
  if (brightness < rules.minBrightness) return '사진이 어두워요. 가능하면 플래시를 켜고 다시 찍어 주세요.'
  if (brightness > rules.maxBrightness) return '빛이 반사돼 너무 밝아요. 각도를 바꿔 다시 찍어 주세요.'
  return ''
}

/**
 * 전체 화면 카메라입니다. 찍기 → 빨간 박스 맞추기 → 잘린 사진 전달 순서로 진행합니다.
 * 다른 모달 위에도 뜨도록 자체 dialog로 띄웁니다.
 * 아이폰 센서 권한은 이 화면을 여는 버튼에서 requestMotionPermission()으로 물어 주세요.
 */
export default function CameraCapture({
  title,
  onCapture,
  onCancel,
  drainId,
  enforceDistance = true,
  reference = null,
}: Props) {
  const account = useContext(AccountId)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const shotUrlRef = useRef<string | null>(null)
  const startBox = reference?.box ?? CAMERA.guide
  const [shot, setShot] = useState<Shot | null>(null)
  const [box, setBox] = useState<Box>({ ...startBox })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [captureResetKey, setCaptureResetKey] = useState(0)

  const { data: drain } = useQuery({
    queryKey: ['drain-detail', drainId],
    queryFn: ({ signal }) => getAdoptionDrainDetail(drainId as number, signal),
    enabled: drainId !== undefined,
    staleTime: 30_000,
    retry: 1,
  })
  const target = drain ? { latitude: drain.latitude, longitude: drain.longitude } : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    // 뒤에 깔린 시트가 Esc·Tab을 가로채 함께 닫히지 않게 막습니다.
    const stop = (event: KeyboardEvent) => event.stopPropagation()
    dialog.addEventListener('keydown', stop)
    return () => {
      dialog.removeEventListener('keydown', stop)
      dialog.close()
    }
  }, [])

  useEffect(() => () => {
    if (shotUrlRef.current) URL.revokeObjectURL(shotUrlRef.current)
  }, [])

  const handleCaptured = async ({ canvas, takenAt, coordinates }: Captured) => {
    setError('')
    try {
      const url = URL.createObjectURL(await canvasToJpeg(canvas))
      shotUrlRef.current = url
      setBox({ ...startBox })
      setShot({
        canvas,
        url,
        takenAt,
        coordinates,
        warning: qualityWarning(canvas, startBox),
      })
    } catch {
      setError('사진을 만들지 못했어요. 다시 찍어 주세요.')
      setCaptureResetKey((count) => count + 1)
    }
  }

  const retake = () => {
    if (shotUrlRef.current) URL.revokeObjectURL(shotUrlRef.current)
    shotUrlRef.current = null
    setError('')
    setShot(null)
  }

  const confirmPhoto = async () => {
    if (!shot || saving) return
    setSaving(true)
    setError('')
    try {
      const cropped = cropWithBox(shot.canvas, shot.canvas.width, shot.canvas.height, box)
      const blob = await canvasToJpeg(cropped)
      void award(account, 'photo').catch(console.error)
      onCapture(
        new File([blob], `drain-${shot.takenAt}.jpg`, {
          type: 'image/jpeg',
          lastModified: shot.takenAt,
        }),
        { takenAt: shot.takenAt, coordinates: shot.coordinates, box },
      )
    } catch {
      setError('사진을 만들지 못했어요. 다시 찍어 주세요.')
      setSaving(false)
    }
  }

  const shotDistance =
    shot?.coordinates && target ? distanceMeters(shot.coordinates, target) : null
  const farWarning =
    enforceDistance && shotDistance !== null && shotDistance > CAMERA.locationLimitM
      ? `빗물받이에서 약 ${distanceText(shotDistance)} 떨어진 곳에서 찍혔어요. 이대로 보내면 거절될 수 있어요.`
      : ''
  const warning = error || farWarning || shot?.warning

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        if (shot) retake()
        else onCancel()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black p-0 backdrop:bg-black"
    >
      <LiveCamera
        active={!shot}
        title={title}
        onCaptured={(captured) => void handleCaptured(captured)}
        onClose={onCancel}
        target={target}
        enforceDistance={enforceDistance}
        reference={reference}
        message={shot ? '' : error}
        captureResetKey={captureResetKey}
      />

      {shot && (
        <div className="absolute inset-0 flex flex-col bg-white text-[#203451]">
          <div
            className="px-4 pb-2"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
          >
            <p className="text-[17px] font-bold leading-snug">
              빨간 박스를 빗물받이 덮개 테두리에 맞춰 주세요
            </p>
            <p className="mt-0.5 text-[15px] leading-snug text-[#3E5670]">
              모서리를 끌면 크기, 가운데를 끌면 위치가 바뀌어요. 흰 점선 안쪽만 AI가 봐요.
            </p>
          </div>

          <BoxEditor
            className="min-h-0 flex-1"
            src={shot.url}
            imageWidth={shot.canvas.width}
            imageHeight={shot.canvas.height}
            box={box}
            onChange={setBox}
          />

          {warning && (
            <p
              role="alert"
              className="mx-4 mt-3 rounded-xl bg-[#FFF4DC] px-3 py-2 text-[15px] font-semibold leading-snug text-[#7A5310]"
            >
              {warning}
            </p>
          )}

          <div
            className="grid grid-cols-[1fr_2fr] gap-3 px-4 pt-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
            <button
              type="button"
              onClick={retake}
              disabled={saving}
              className="h-14 rounded-2xl border border-[#CFE4F5] bg-white text-base font-bold text-[#24496B] disabled:opacity-50"
            >
              다시 찍기
            </button>
            <button
              type="button"
              onClick={() => void confirmPhoto()}
              disabled={saving}
              className="h-14 rounded-2xl bg-[#329BEC] text-[17px] font-bold text-white disabled:opacity-50"
            >
              {saving ? '사진 준비 중...' : '이 사진 쓰기'}
            </button>
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  )
}
