import { useState } from 'react'

const SAFETY_REPORT_URL = 'https://www.safetyreport.go.kr/'

type Props = {
  reportId: number
  latitude: number | null
  longitude: number | null
  description: string | null
}

/** 안전신문고에 붙여 넣을 신고 문구를 만듭니다. */
function buildReportText({ reportId, latitude, longitude, description }: Props): string {
  const lines = ['[빗물받이 막힘 신고]']
  if (latitude != null && longitude != null) {
    const lat = latitude.toFixed(5)
    const lng = longitude.toFixed(5)
    lines.push(`위치: 위도 ${lat}, 경도 ${lng}`)
    lines.push(`지도: https://map.kakao.com/link/map/빗물받이,${lat},${lng}`)
  }
  lines.push(`상태: ${description?.trim() || '빗물받이 덮개 틈 안쪽까지 막혀 주민이 직접 치울 수 없는 상태입니다.'}`)
  lines.push(`(또랑 제보 번호 #${reportId})`)
  return lines.join('\n')
}

/**
 * 막힘 제보를 접수한 뒤 안전신문고 신고로 이어 줍니다.
 * 위치와 문구를 채운 신고 문안을 복사하고 안전신문고를 새 창으로 엽니다.
 */
export default function SafetyReportLink(props: Props) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')
  const text = buildReportText(props)

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied('copied')
    } catch {
      // 복사가 막힌 브라우저에서는 아래 글상자에서 직접 복사할 수 있게 합니다.
      setCopied('failed')
    }
    window.open(SAFETY_REPORT_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <section aria-label="안전신문고 신고" className="break-keep rounded-2xl border border-[#DCE4F8] bg-[#F5F7FF] p-4">
      <h3 className="text-sm font-bold text-[#304563]">급한 막힘은 안전신문고에도 알려 주세요</h3>
      <p className="mt-1 text-[13px] leading-5 text-[#516A7D]">
        또랑 제보는 운영 담당자가 확인해요. 안전신문고에 함께 신고하면 지자체에 바로 접수돼요. 위치와 내용을 채운 문구를 복사해 드릴게요.
      </p>

      <button
        type="button"
        onClick={() => void copyAndOpen()}
        className="mt-3 min-h-11 w-full rounded-xl border border-[#6384EF] bg-white px-3 text-sm font-bold text-[#6384EF]"
      >
        신고 문구 복사하고 안전신문고 열기
      </button>

      {copied === 'copied' && (
        <p role="status" className="mt-2 text-[13px] font-semibold leading-5 text-[#247A4B]">
          신고 문구를 복사했어요. 안전신문고 신고 내용에 붙여 넣어 주세요.
        </p>
      )}
      {copied === 'failed' && (
        <label className="mt-2 block text-[13px] leading-5 text-[#516A7D]">
          자동 복사가 되지 않았어요. 아래 문구를 길게 눌러 복사해 주세요.
          <textarea
            readOnly
            rows={5}
            value={text}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-1 block w-full resize-none rounded-xl border border-[#DFE5F0] bg-white px-3 py-2 text-[13px] leading-5 text-[#304563]"
          />
        </label>
      )}
    </section>
  )
}
