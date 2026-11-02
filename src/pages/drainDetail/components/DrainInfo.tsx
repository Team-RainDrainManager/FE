import { Link } from 'react-router'

import type { DrainDetailDto } from '../../../types/drainDetail'

const STATUS_LABELS = {
  ACTIVE: '등록 완료',
  PENDING: '등록 대기',
  REMOVED: '삭제 처리',
}

export default function DrainInfo({
  drain,
}: {
  drain: DrainDetailDto
}) {
  const adopted = drain.adoptionStatus === 'ADOPTED'

  return (
    <section className="bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#EEF4FA] px-3 py-1 text-[11px] font-bold text-[#728CA4]">
          {STATUS_LABELS[drain.status]}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            adopted
              ? 'bg-[#E8F7EF] text-[#259B68]'
              : 'bg-[#F2F4F7] text-[#8493A5]'
          }`}
        >
          {adopted ? '입양 중' : '미입양'}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-[#203451]">
        {drain.adoption?.nickname ?? `빗물받이 #${drain.id}`}
      </h2>

      <p className="mt-1 text-xs text-[#78899F]">
        빗물받이 번호 #{drain.id}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1F6] pt-3">
        <p className="text-[11px] tabular-nums text-[#78899F]">
          위치 {drain.latitude.toFixed(5)}, {drain.longitude.toFixed(5)}
        </p>
        <Link to="/map" className="rounded-full bg-[#EAF2FF] px-3 py-2 text-xs font-semibold text-[#3981F7]">지도 보기 ›</Link>
      </div>
    </section>
  )
}
