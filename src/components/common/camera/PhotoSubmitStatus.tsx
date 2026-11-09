import CapturedPreview from './CapturedPreview'

type Props = {
  file: File
  alt: string
  busy: boolean
  busyText: string
  retryLabel: string
  onRetake: () => void
  onRetry: () => void
}

/**
 * 찍자마자 보낸 사진의 상태를 보여 줍니다. 판정 중에는 안내만, 실패해서 여기 머물면 다시 찍기·다시 보내기를 보여 줍니다.
 */
export default function PhotoSubmitStatus({
  file,
  alt,
  busy,
  busyText,
  retryLabel,
  onRetake,
  onRetry,
}: Props) {
  return (
    <div className="space-y-3">
      <CapturedPreview file={file} alt={alt} />
      {busy ? (
        <p
          role="status"
          className="animate-pulse rounded-xl bg-[#F4F7FC] p-3 text-center text-sm font-semibold text-[#24496B]"
        >
          {busyText}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRetake}
            className="min-h-12 rounded-full border border-[#CFE4F5] bg-white p-3 text-sm font-bold text-[#24496B]"
          >
            다시 찍기
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-12 rounded-full bg-[#329BEC] p-3 text-sm font-bold text-white"
          >
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  )
}
