
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

type CameraFacing = 'environment' | 'user'

type Props = {
  title: string
  onCapture: (file: File) => void
  onCancel: () => void
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return '카메라 권한이 거부됐어요. 브라우저 설정에서 카메라를 허용해주세요.'

      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return '사용할 수 있는 카메라를 찾지 못했어요.'

      case 'NotReadableError':
      case 'TrackStartError':
        return '카메라를 사용할 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.'

      case 'OverconstrainedError':
        return '요청한 카메라 설정을 사용할 수 없어요.'
    }
  }

  return '카메라를 실행하지 못했어요. 다시 시도해주세요.'
}

export default function CameraCapture({
  title,
  onCapture,
  onCancel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] =
    useState<CameraFacing>('environment')

  const [retryCount, setRetryCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const videoElement = videoRef.current

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setError(
            '카메라 API를 사용할 수 없어요. HTTPS 또는 localhost에서 실행해주세요.',
          )
          setLoading(false)
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: facingMode,
            },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stopStream(stream)
          return
        }

        streamRef.current = stream

        if (videoElement) {
          videoElement.srcObject = stream

          try {
            await videoElement.play()
          } catch {
            // 자동 재생에 실패하면 브라우저의
            // video autoPlay 동작을 다시 기다림
          }
        }

        if (!cancelled) {
          setError(null)
          setLoading(false)
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(cameraErrorMessage(caughtError))
          setLoading(false)
        }
      }
    }

    void openCamera()

    // 모달 종료 또는 카메라 변경 시 스트림 중지
    return () => {
      cancelled = true

      stopStream(streamRef.current)
      streamRef.current = null

      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [facingMode, retryCount])

  const changeCamera = () => {
    setReady(false)
    setLoading(true)
    setError(null)

    setFacingMode((previous) =>
      previous === 'environment' ? 'user' : 'environment',
    )
  }

  const retryCamera = () => {
    setReady(false)
    setLoading(true)
    setError(null)
    setRetryCount((previous) => previous + 1)
  }

  const takePhoto = () => {
    const video = videoRef.current

    if (
      !video ||
      !ready ||
      capturing ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return
    }

    setCapturing(true)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setCapturing(false)
      setError('사진을 촬영하지 못했어요.')
      return
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCapturing(false)
          setError('사진 저장에 실패했어요. 다시 촬영해주세요.')
          return
        }

        const capturedAt = Date.now()

        const file = new File(
          [blob],
          `drain-inspection-${capturedAt}.jpg`,
          {
            type: 'image/jpeg',
            lastModified: capturedAt,
          },
        )

        onCapture(file)
      },
      'image/jpeg',
      0.9,
    )
  }

  // 카메라 접근이 어려운 환경에서 사용할 대체 선택
  const handleFallbackFile = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있어요.')
      return
    }

    onCapture(file)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#24496B]">
          {title}
        </h3>

        <span className="text-[10px] text-[#8297AC]">
          실시간 카메라
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-[#142C40]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
          className="aspect-[3/4] max-h-[55dvh] w-full object-cover"
        />

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#142C40]/80">
            <p className="text-xs text-white">
              카메라를 실행하는 중...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#142C40] p-5 text-center">
            <p role="alert" className="text-xs leading-relaxed text-white">
              {error}
            </p>

            <button
              type="button"
              onClick={retryCamera}
              className="rounded-full bg-white px-5 py-2 text-xs font-bold text-[#24496B]"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>

      {!error && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={changeCamera}
            className="rounded-full bg-[#EAF6FF] px-4 py-3 text-xs font-bold text-[#3489DC]"
          >
            카메라 전환
          </button>

          <button
            type="button"
            onClick={takePhoto}
            disabled={!ready || loading || capturing}
            className="min-h-12 flex-1 rounded-full bg-[#329BEC] px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {capturing ? '촬영 중...' : '사진 촬영'}
          </button>
        </div>
      )}

      {error && (
        <label className="block rounded-xl border border-[#CFE4F5] p-3 text-center text-xs font-bold text-[#3489DC]">
          카메라 대신 사진 선택
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            className="mt-2 block w-full text-xs"
          />
        </label>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-full bg-[#F1F6FB] p-3 text-xs font-semibold text-[#607C99]"
      >
        취소
      </button>

      <p className="text-center text-[10px] leading-relaxed text-[#9AAFC1]">
        카메라 영상은 촬영하기 전까지 저장되지 않아요.
      </p>
    </div>
  )
}
