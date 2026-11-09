import { requestMotionPermission } from './motion'

const SAFETY_RULES = [
  '인도 등 안전한 곳에서만 찍을게요.',
  '비가 오거나 위험할 때는 하지 않을게요.',
  '빗물받이 덮개를 직접 열지 않을게요.',
  '사람 얼굴이나 차 번호판이 찍히지 않게 할게요.',
]

type Props = {
  label?: string
  disabled?: boolean
  onStart: () => void
}

/**
 * 안전 확인과 카메라 켜기를 버튼 하나로 합칩니다. 흐름마다 처음 한 번만 보여 주세요.
 * 아이폰 센서 권한도 이 버튼을 누른 순간에 묻습니다.
 */
export default function SafetyStart({
  label = '안전수칙을 지킬게요. 사진 찍기',
  disabled = false,
  onStart,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[#EAF6FF] p-3">
        <p className="text-sm font-bold text-[#24496B]">찍기 전에 확인해 주세요</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#2F5570]">
          {SAFETY_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          void requestMotionPermission()
          onStart()
        }}
        className="min-h-12 w-full rounded-full bg-[#329BEC] p-3 text-base font-bold text-white disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  )
}
