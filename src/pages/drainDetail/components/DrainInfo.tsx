
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
    <section className="rounded-[20px] bg-white p-4">
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

      <h2 className="mt-4 text-xl font-extrabold text-[#24496B]">
        {drain.adoption?.nickname ?? `빗물받이 #${drain.id}`}
      </h2>

      <p className="mt-1 text-xs text-[#8297AC]">
        빗물받이 번호 #{drain.id}
      </p>

      <div className="mt-4 rounded-xl bg-[#F5FAFF] p-3">
        <p className="text-xs font-semibold text-[#607C99]">
          위치 정보
        </p>

        <p className="mt-2 text-[11px] text-[#8297AC]">
          위도 {drain.latitude.toFixed(5)}
          <br />
          경도 {drain.longitude.toFixed(5)}
        </p>

        <p className="mt-2 text-[10px] text-[#9BAABD]">
          주소는 현재 상세 API에서 제공하지 않아요.
        </p>
      </div>
    </section>
  )
}
