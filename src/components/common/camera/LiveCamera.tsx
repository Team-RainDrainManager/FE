import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { boxStyle, containRect, expandBox, type Box } from './box'
import { CAMERA } from './config'
import {
  distanceMeters,
  distanceText,
  useGeolocation,
  type Coordinates,
  type Fix,
  type GeoStatus,
} from './geo'
import { drawScaled, fileToCanvas } from './image'
import { MotionWatcher } from './motion'
import { laplacianVariance, meanAbsDiff, meanOf, sampleRegion } from './quality'
import { useElementSize } from './useElementSize'

export type Captured = {
  canvas: HTMLCanvasElement
  takenAt: number
  /** 찍을 때의 위치. 믿을 만한 값이 없으면 null이고, 보낼 때 다시 잽니다. */
  coordinates: Coordinates | null
}

export type CameraReference = { file: File; box: Box }

type Props = {
  /** 촬영 화면이 보이는지. 확인 화면으로 넘어가면 false가 되고 플래시도 꺼집니다. */
  active: boolean
  title: string
  onCaptured: (captured: Captured) => void
  onClose: () => void
  /** 찍을 빗물받이의 위치. 있으면 거리를 보여 줍니다. */
  target: Coordinates | null
  /** 서버가 멀리서 찍은 사진을 거절하는 흐름인지. 아니면 맞는 빗물받이인지 확인만 부탁합니다. */
  enforceDistance: boolean
  /** 청소 전 사진. 있으면 같은 구도로 찍도록 반투명하게 겹칩니다. */
  reference: CameraReference | null
  /** 바깥에서 알려 줄 문구 */
  message: string
  /** 값이 바뀌면 다시 찍을 수 있게 합니다. */
  captureResetKey: number
}

type LiveStatus = {
  /** null = 아직 판단 중 */
  still: boolean | null
  tilt: 'ok' | 'low' | 'unknown'
  sharp: boolean
  bright: boolean
  countdown: number
}

type TorchState = 'unsupported' | 'off' | 'on'

/** 표준 타입에는 아직 없는 손전등 제약입니다. */
type TorchConstraint = MediaTrackConstraintSet & { torch?: boolean }

const INITIAL_LIVE: LiveStatus = {
  still: null,
  tilt: 'unknown',
  sharp: false,
  bright: true,
  countdown: 0,
}

const AUTO_PREFERENCE_KEY = 'torang:camera-auto:v2'

function readAutoPreference(): boolean {
  try {
    return window.localStorage.getItem(AUTO_PREFERENCE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveAutoPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(AUTO_PREFERENCE_KEY, String(enabled))
  } catch {
    // 시크릿 모드 등에서 저장소를 쓸 수 없어도 촬영은 진행할 수 있습니다.
  }
}

function hasTorch(track: MediaStreamTrack | null): boolean {
  const capabilities = track?.getCapabilities?.() as
    | (MediaTrackCapabilities & { torch?: boolean })
    | undefined
  return Boolean(capabilities?.torch)
}

function cameraErrorText(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return '카메라 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 카메라를 허용해 주세요.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return '사용할 수 있는 카메라를 찾지 못했어요. 휴대폰에서 열어 주세요.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '다른 앱이 카메라를 쓰고 있어요. 그 앱을 닫고 다시 켜 주세요.'
  }
  return '카메라를 켜지 못했어요. 다시 시도해 주세요.'
}

function hintText(
  live: LiveStatus,
  auto: boolean,
  torch: TorchState,
  canUseNative: boolean,
  far: boolean,
  hasReference: boolean,
): string {
  if (live.countdown > 0) return '그대로 멈춰 주세요'
  if (live.tilt === 'low') return '휴대폰을 더 숙여서 바닥을 내려다봐 주세요'
  if (!live.bright) {
    if (torch === 'off') return '어두워요. 위의 플래시를 켜 주세요'
    if (torch === 'on') return '플래시를 켜도 어두워요. 조금 더 가까이 비춰 주세요'
    return canUseNative
      ? "어두워요. 아래 '기본 카메라로 찍기'를 누르면 플래시를 쓸 수 있어요"
      : '어두워요. 밝은 곳에서 찍어 주세요'
  }
  if (live.still === false) return '휴대폰을 잠깐 멈춰 주세요'
  if (live.still === true && !live.sharp) return '흐려요. 조금 떨어져서 찍어 주세요'
  if (far) return '빗물받이 가까이 가서 찍어 주세요'
  const aim = hasReference
    ? '흐리게 보이는 청소 전 사진에 덮개를 맞추고'
    : '틀 안에 빗물받이 덮개를 맞추고'
  if (auto) return `${aim} 멈추면 자동으로 찍혀요`
  return live.still === true ? '좋아요! 버튼을 눌러 찍어 주세요' : `${aim} 버튼을 눌러 주세요`
}

function locationLine(
  target: Coordinates | null,
  distance: number | null,
  fix: Fix | null,
  status: GeoStatus,
  enforceDistance: boolean,
): { text: string; warn: boolean } | null {
  if (status === 'denied') {
    return { text: '위치 권한이 꺼져 있어요. 켜야 사진을 인증할 수 있어요.', warn: true }
  }
  if (!target) return null
  if (distance === null || !fix) {
    return status === 'unavailable'
      ? { text: '위치를 찾지 못했어요. 보낼 때 다시 확인할게요.', warn: true }
      : { text: '빗물받이까지 거리를 재는 중이에요', warn: false }
  }
  const accuracy =
    fix.accuracy > CAMERA.showAccuracyOverM ? ` (위치 오차 ±${Math.round(fix.accuracy)}m)` : ''
  if (distance > CAMERA.locationLimitM) {
    return {
      text: enforceDistance
        ? `빗물받이에서 약 ${distanceText(distance)} 떨어져 있어요. ${CAMERA.locationLimitM}m 안에서 찍어야 해요.${accuracy}`
        : `선택한 빗물받이에서 약 ${distanceText(distance)} 떨어져 있어요. 이 빗물받이가 맞는지 확인해 주세요.${accuracy}`,
      warn: true,
    }
  }
  return { text: `빗물받이까지 약 ${distanceText(distance)}${accuracy}`, warn: false }
}

function ReferenceImage({ file, box }: CameraReference) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    const url = URL.createObjectURL(file)
    if (image) image.src = url
    return () => {
      if (image) image.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <img
      ref={imageRef}
      alt=""
      className="absolute"
      style={{
        ...boxStyle(expandBox(box, CAMERA.contextPadding)),
        opacity: CAMERA.referenceOpacity,
      }}
    />
  )
}

function GuideCorners({ color }: { color: string }) {
  const border = { borderColor: color }
  const corner = 'absolute h-9 w-9'
  return (
    <>
      <div
        className="absolute inset-0 border-2 border-dashed"
        style={{ borderColor: `${color}99` }}
      />
      <div className={`${corner} left-0 top-0 border-l-[5px] border-t-[5px]`} style={border} />
      <div className={`${corner} right-0 top-0 border-r-[5px] border-t-[5px]`} style={border} />
      <div className={`${corner} bottom-0 left-0 border-b-[5px] border-l-[5px]`} style={border} />
      <div className={`${corner} bottom-0 right-0 border-b-[5px] border-r-[5px]`} style={border} />
    </>
  )
}

/** 실시간 촬영 화면입니다. 후면 카메라만 쓰고, 화면에 보이는 영상이 곧 찍히는 사진 전체입니다. */
export default function LiveCamera({
  active,
  title,
  onCaptured,
  onClose,
  target,
  enforceDistance,
  reference,
  message,
  captureResetKey,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const nativeInputRef = useRef<HTMLInputElement>(null)
  const [viewportRef, viewport] = useElementSize<HTMLDivElement>()

  const [video, setVideo] = useState({ width: 0, height: 0 })
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [live, setLive] = useState<LiveStatus>(INITIAL_LIVE)
  const [flash, setFlash] = useState(false)
  const [note, setNote] = useState('')
  const [autoOn, setAutoOn] = useState(readAutoPreference)
  const [isTouchDevice] = useState(
    () => window.matchMedia?.('(pointer: coarse)').matches ?? false,
  )

  // 플래시는 지원하는 폰에서만 켤 수 있습니다. 어두우면 촬영 화면마다 한 번 자동으로 켜고,
  // 사람이 직접 켜고 끄면 그 뒤로는 자동으로 건드리지 않습니다.
  const [track, setTrack] = useState<MediaStreamTrack | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchWanted, setTorchWanted] = useState(false)
  const [nativeOffered, setNativeOffered] = useState(false)

  const { fix, status: gpsStatus } = useGeolocation()
  const distance = target && fix ? distanceMeters(fix, target) : null
  const far = enforceDistance && distance !== null && distance > CAMERA.locationLimitM
  // 청소 후 촬영은 청소 전 사진과 같은 자리에 틀을 둡니다.
  const guide = reference?.box ?? CAMERA.guide

  const motionRef = useRef(new MotionWatcher())
  const capturingRef = useRef(false)
  const autoRef = useRef(autoOn)
  const onCapturedRef = useRef(onCaptured)
  const torchSupportedRef = useRef(false)
  const torchTouchedRef = useRef(false)
  const autoTorchDoneRef = useRef(false)
  const torchFailedRef = useRef(false)
  const noteTimerRef = useRef(0)
  const fixRef = useRef<Fix | null>(null)
  const farRef = useRef(false)
  const guideRef = useRef<Box>(guide)

  useEffect(() => {
    autoRef.current = autoOn
    onCapturedRef.current = onCaptured
    torchSupportedRef.current = torchSupported
    fixRef.current = fix
    farRef.current = far
    guideRef.current = guide
  }, [autoOn, onCaptured, torchSupported, fix, far, guide])

  useEffect(() => {
    capturingRef.current = false
  }, [captureResetKey])

  const recentCoordinates = useCallback((): Coordinates | null => {
    const recent = fixRef.current
    if (!recent || Date.now() - recent.at > CAMERA.gpsMaxAgeMs) return null
    return { latitude: recent.latitude, longitude: recent.longitude }
  }, [])

  const showNote = useCallback((text: string) => {
    window.clearTimeout(noteTimerRef.current)
    setNote(text)
    noteTimerRef.current = window.setTimeout(() => setNote(''), CAMERA.torch.noteMs)
  }, [])

  useEffect(() => () => window.clearTimeout(noteTimerRef.current), [])

  // 카메라 켜기
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const element = videoRef.current

    const open = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('이 주소에서는 카메라를 쓸 수 없어요. https 주소로 열어 주세요.')
        return
      }
      try {
        const opened = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
        })
        if (cancelled) {
          opened.getTracks().forEach((item) => item.stop())
          return
        }
        stream = opened
        const videoTrack = opened.getVideoTracks()[0] ?? null
        setTrack(videoTrack)
        setTorchSupported(hasTorch(videoTrack))
        setError(null)
        if (element) {
          element.srcObject = opened
          void element.play().catch(() => undefined)
        }
      } catch (caught) {
        if (!cancelled) setError(cameraErrorText(caught))
      }
    }

    void open()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((item) => item.stop())
      if (element) element.srcObject = null
    }
  }, [attempt])

  // 원하는 플래시 상태를 카메라에 반영합니다. 확인 화면으로 넘어가면 끄고, 돌아오면 다시 켭니다.
  useEffect(() => {
    if (!track || !torchSupported) return
    const on = torchWanted && active
    const constraint: TorchConstraint = { torch: on }
    track.applyConstraints({ advanced: [constraint] }).catch(() => {
      if (!on) return
      torchFailedRef.current = true
      setTorchSupported(false)
      setTorchWanted(false)
      setNativeOffered(true)
      showNote("이 휴대폰은 앱 안에서 플래시를 켤 수 없어요. '기본 카메라로 찍기'를 누르면 쓸 수 있어요.")
    })
  }, [track, torchSupported, torchWanted, active, showNote])

  // 움직임·기울기 센서
  useEffect(() => {
    const motion = motionRef.current
    motion.start()
    return () => motion.stop()
  }, [])

  // 확인 화면에서 돌아오면 다시 찍을 수 있게 합니다.
  useEffect(() => {
    if (!active) return
    capturingRef.current = false
    void videoRef.current?.play().catch(() => undefined)
  }, [active])

  const shoot = useCallback(() => {
    const element = videoRef.current
    if (!element || !element.videoWidth || capturingRef.current) return
    capturingRef.current = true
    const canvas = drawScaled(
      element,
      element.videoWidth,
      element.videoHeight,
      CAMERA.maxLongEdge,
    )
    navigator.vibrate?.(40)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 160)
    setLive((previous) => ({ ...previous, countdown: 0 }))
    onCapturedRef.current({ canvas, takenAt: Date.now(), coordinates: recentCoordinates() })
  }, [recentCoordinates])

  // 흔들림·각도·선명도·밝기 검사
  useEffect(() => {
    if (!active || error || !video.width) return
    const canvas = document.createElement('canvas')
    const rules = CAMERA.live
    let previous: Float32Array | null = null
    let lastUnstable = performance.now()
    let okSince: number | null = null
    let darkSince: number | null = null

    const timer = window.setInterval(() => {
      const element = videoRef.current
      if (!element || element.readyState < 2 || !element.videoWidth || capturingRef.current) {
        return
      }

      let sample: ReturnType<typeof sampleRegion>
      try {
        sample = sampleRegion(
          element,
          element.videoWidth,
          element.videoHeight,
          guideRef.current,
          rules.analysisWidth,
          canvas,
        )
      } catch {
        // 일부 모바일 브라우저에서는 순간적으로 프레임을 읽지 못할 수 있습니다.
        return
      }

      const now = performance.now()
      const sharpness = laplacianVariance(sample.gray, sample.width, sample.height)
      const brightness = meanOf(sample.gray)
      const diff = previous ? meanAbsDiff(previous, sample.gray) : 255
      previous = sample.gray

      const sensorStill = motionRef.current.stillFor(now)
      if (sensorStill === null && diff > rules.maxFrameDiff) lastUnstable = now
      const still = (sensorStill ?? now - lastUnstable) >= rules.stableMs
      const beta = motionRef.current.beta
      const portrait = window.innerHeight >= window.innerWidth
      const tilt: LiveStatus['tilt'] =
        beta === null || !portrait
          ? 'unknown'
          : beta >= rules.minTilt && beta <= rules.maxTilt
            ? 'ok'
            : 'low'
      const sharp = sharpness >= rules.minSharpness
      const bright = brightness >= CAMERA.quality.minBrightness

      // 어두운 상태가 이어지면 플래시를 한 번 자동으로 켭니다.
      if (bright) {
        darkSince = null
      } else {
        darkSince ??= now
        if (
          now - darkSince >= CAMERA.torch.autoOnAfterMs &&
          torchSupportedRef.current &&
          !torchTouchedRef.current &&
          !autoTorchDoneRef.current
        ) {
          autoTorchDoneRef.current = true
          setTorchWanted(true)
          showNote('어두워서 플래시를 켰어요')
        }
      }

      let countdown = 0
      if (autoRef.current && !farRef.current && still && tilt !== 'low' && sharp && bright) {
        okSince ??= now
        const step = Math.floor((now - okSince) / rules.countdownStepMs)
        if (step >= rules.countdownSteps) {
          okSince = null
          shoot()
          return
        }
        countdown = rules.countdownSteps - step
      } else {
        okSince = null
      }

      setLive({ still, tilt, sharp, bright, countdown })
    }, 1000 / rules.analysisFps)

    return () => window.clearInterval(timer)
  }, [active, error, video.width, shoot, showNote])

  const onVideoSize = () => {
    const element = videoRef.current
    if (element?.videoWidth) {
      setVideo({ width: element.videoWidth, height: element.videoHeight })
    }
    // 일부 폰은 영상이 나온 뒤에야 플래시 지원 여부를 알려 줍니다.
    if (!torchSupported && !torchFailedRef.current && hasTorch(track)) {
      setTorchSupported(true)
    }
  }

  const retry = () => {
    capturingRef.current = false
    setError(null)
    setVideo({ width: 0, height: 0 })
    setLive(INITIAL_LIVE)
    setAttempt((count) => count + 1)
  }

  const toggleAuto = () => {
    const next = !autoOn
    setAutoOn(next)
    saveAutoPreference(next)
    setLive((previous) => ({ ...previous, countdown: 0 }))
  }

  const toggleTorch = () => {
    if (!torchSupported) {
      setNativeOffered(true)
      showNote("이 휴대폰은 앱 안에서 플래시를 켤 수 없어요. '기본 카메라로 찍기'를 누르면 쓸 수 있어요.")
      return
    }
    torchTouchedRef.current = true
    setTorchWanted((wanted) => !wanted)
  }

  // 기본 카메라 앱으로 찍은 사진도 같은 확인 화면과 자르기를 거칩니다. 오래된 사진은 받지 않습니다.
  const onNativePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    // 파일 시각을 알 수 없는 브라우저는 0에 가까운 값을 줍니다. 그때는 막지 않습니다.
    if (file.lastModified > dayMs && now - file.lastModified > CAMERA.nativePhotoMaxAgeMs) {
      showNote('방금 찍은 사진만 쓸 수 있어요. 다시 찍어 주세요.')
      return
    }
    try {
      const canvas = await fileToCanvas(file)
      onCapturedRef.current({ canvas, takenAt: now, coordinates: recentCoordinates() })
    } catch {
      showNote('사진을 읽지 못했어요. 다시 찍어 주세요.')
    }
  }

  const torchState: TorchState = !torchSupported ? 'unsupported' : torchWanted ? 'on' : 'off'
  const rect = containRect(viewport.width, viewport.height, video.width, video.height)
  const ready = !error && video.width > 0
  const allGood = !far && live.still === true && live.tilt !== 'low' && live.sharp && live.bright
  const location = locationLine(target, distance, fix, gpsStatus, enforceDistance)
  const notice = note || message
  const frameColor = allGood ? '#22C55E' : '#FFFFFF'
  const showNative = isTouchDevice && (nativeOffered || (ready && !live.bright && !torchSupported))

  const nativeInput = (
    <input
      ref={nativeInputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(event) => void onNativePhoto(event)}
    />
  )

  return (
    <div className={`absolute inset-0 bg-black text-white select-none ${active ? '' : 'hidden'}`}>
      <div ref={viewportRef} className="absolute inset-0">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={onVideoSize}
          onResize={onVideoSize}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {rect && ready && (
          <div className="pointer-events-none absolute" style={rect}>
            {reference && <ReferenceImage file={reference.file} box={reference.box} />}
            <div className="absolute" style={boxStyle(guide)}>
              <GuideCorners color={frameColor} />
              {live.countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-7xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    {live.countdown}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {flash && <div className="absolute inset-0 bg-[#FFFFFF]/80" />}

      <div
        className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-3 pb-6"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 shrink-0 rounded-full bg-black/60 px-4 text-[15px] font-semibold"
          >
            닫기
          </button>
          {!error && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={autoOn}
                onClick={toggleAuto}
                className={`h-11 rounded-full px-3 text-[15px] font-semibold ${
                  autoOn ? 'bg-[#329BEC]' : 'bg-black/60'
                }`}
              >
                자동 촬영 {autoOn ? '켜짐' : '꺼짐'}
              </button>
              {(torchSupported || isTouchDevice) && (
                <button
                  type="button"
                  aria-pressed={torchWanted}
                  onClick={toggleTorch}
                  className={`h-11 rounded-full px-3 text-[15px] font-semibold ${
                    torchWanted ? 'bg-yellow-300 text-gray-900' : 'bg-black/60'
                  }`}
                >
                  플래시 {torchSupported ? (torchWanted ? '켜짐' : '꺼짐') : ''}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[17px] font-bold">{title}</p>
        <p className="mt-0.5 text-[14px] leading-snug">
          비 올 때 금지 · 인도 쪽에서만 · 덮개 열지 않기 · 사람·번호판 찍지 않기
        </p>
      </div>

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p role="alert" className="text-[17px] font-semibold leading-relaxed">
            {error}
          </p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={retry}
              className="h-12 rounded-xl bg-[#FFFFFF] text-base font-bold text-gray-900"
            >
              카메라 다시 켜기
            </button>
            {isTouchDevice && (
              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="h-12 rounded-xl bg-[#329BEC] text-base font-bold"
              >
                기본 카메라로 찍기
              </button>
            )}
          </div>
          {notice && <p className="text-[15px] text-amber-300">{notice}</p>}
        </div>
      ) : (
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-10"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}
        >
          {location && (
            <p
              className={`mb-1 text-center text-[15px] leading-snug ${
                location.warn ? 'font-bold text-amber-300' : 'font-semibold text-green-300'
              }`}
            >
              {location.text}
            </p>
          )}
          <p
            role="status"
            className="text-center text-[17px] font-bold leading-snug"
          >
            {ready
              ? hintText(live, autoOn, torchState, isTouchDevice, far, reference !== null)
              : '카메라를 켜는 중이에요'}
          </p>
          {torchState === 'on' && (
            <p className="mt-1 text-center text-[15px] text-yellow-200">
              빛이 반사되면 휴대폰을 조금 비스듬히 기울여 주세요
            </p>
          )}
          {notice && <p className="mt-1 text-center text-[15px] text-amber-300">{notice}</p>}
          {showNative && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="h-11 rounded-full bg-black/60 px-4 text-[15px] font-semibold"
              >
                기본 카메라로 찍기
              </button>
            </div>
          )}
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={shoot}
              disabled={!ready}
              aria-label="사진 찍기"
              className="h-[76px] w-[76px] rounded-full border-[5px] border-white bg-[#FFFFFF]/25 active:bg-[#FFFFFF]/60 disabled:opacity-40"
            />
          </div>
        </div>
      )}

      {nativeInput}
    </div>
  )
}
