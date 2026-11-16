import Sheet from '../../../components/common/Sheet'

import { drainCategory, type DrainCategory, type DrainMapItem } from '../../../types/map'

interface DrainListPanelProps {
  drains: DrainMapItem[]
  onSelect: (drain: DrainMapItem) => void
  onClose: () => void
}

// 지도 마커와 같은 분류로 표시합니다.
const CATEGORY_TEXT: Record<DrainCategory, string> = {
  unadopted: '미입양',
  normal: '정상',
  'inspection-needed': '점검 필요',
  blocked: '막힘 제보',
  unknown: '상태 미확인',
}

const CATEGORY_STYLE: Record<DrainCategory, string> = {
  unadopted: 'bg-[#EDF1F5] text-[#5B6472]',
  normal: 'bg-[#DAF5E6] text-[#1E7A47]',
  'inspection-needed': 'bg-[#FFF1D8] text-[#8A5B00]',
  blocked: 'bg-[#FFE2E2] text-[#B23A3E]',
  unknown: 'bg-[#EDF1F5] text-[#5B6472]',
}

export default function DrainListPanel({
  drains,
  onSelect,
  onClose,
}: DrainListPanelProps) {
  return (
    <Sheet
      title="빗물받이 목록"
      description={'검색 및 필터 결과 ' + drains.length + '개'}
      onClose={onClose}
    >
      {drains.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#8294A5]">
          조건에 맞는 빗물받이가 없어요.
        </p>
      ) : (
        drains.map((drain) => (
          <button
            key={drain.id}
            type="button"
            onClick={() => onSelect(drain)}
            className="flex w-full items-center justify-between gap-3 border-b border-[#F0F3F6] px-2 py-4 text-left last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    CATEGORY_STYLE[drainCategory(drain)]
                  }`}
                >
                  {CATEGORY_TEXT[drainCategory(drain)]}
                </span>

                <span className="text-sm font-bold text-[#284B66]">
                  {drain.nickname ??
                    drain.name}
                </span>
              </div>

              <p className="mt-1 text-xs text-[#8393A3]">
                {drain.address ??
                  (drain.latitude === null
                    ? '위치 확인 필요'
                    : '주소 정보 없음')}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {drain.level !== null && (
                <p className="text-sm font-bold text-[#338CF0]">
                  Lv.{drain.level}
                  {drain.levelTitle &&
                    ` · ${drain.levelTitle}`}
                </p>
              )}

              {drain.score !== null && (
                <p className="mt-1 text-[11px] text-[#93A2AF]">
                  {drain.score} XP
                </p>
              )}
            </div>

          </button>
        ))
      )}
    </Sheet>
  )
}
