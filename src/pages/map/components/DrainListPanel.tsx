import type { DrainMapItem } from '../../../types/map'

interface DrainListPanelProps {
  drains: DrainMapItem[]
  onSelect: (drain: DrainMapItem) => void
  onClose: () => void
}

const STATUS_TEXT = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
}

const STATUS_STYLE = {
  unadopted: 'bg-[#E6F1E9] text-[#58816B]',
  normal: 'bg-[#DAF5ED] text-[#268B76]',
  overdue: 'bg-[#FFF1D8] text-[#B78025]',
  blocked: 'bg-[#FFE2E2] text-[#C85858]',
}

export default function DrainListPanel({
  drains,
  onSelect,
  onClose,
}: DrainListPanelProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-end">
      <button
        type="button"
        aria-label="목록 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/35"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="빗물받이 목록"
        className="relative z-10 flex max-h-[78%] w-full flex-col rounded-t-3xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#EAF0F4] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#284B66]">
              빗물받이 목록
            </h2>
            <p className="mt-1 text-xs text-[#8294A5]">
              검색 및 필터 결과 {drains.length}개
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#F2F6FA] px-3 py-2 text-sm text-[#647C8E]"
          >
            닫기
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-2">
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
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLE[drain.status]}`}
                    >
                      {STATUS_TEXT[drain.status]}
                    </span>
                    <span className="text-sm font-bold text-[#284B66]">
                      {drain.nickname ?? drain.name}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#8393A3]">
                    {drain.address}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#338CF0]">
                    Lv.{drain.level}
                  </p>
                  <p className="mt-1 text-[11px] text-[#93A2AF]">
                    {drain.xp} XP
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}