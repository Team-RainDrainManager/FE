
import type { DrainDetailDto } from '../../../types/drainDetail'

export default function DrainPhoto({
  drain,
}: {
  drain: DrainDetailDto
}) {
  return (
    <section className="rounded-[24px] border border-[#E8EDF5] bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-[#203451]">
        빗물받이 사진
      </h3>

      {drain.photoUrl ? (
        <img
          src={drain.photoUrl}
          alt={`빗물받이 ${drain.id}번 사진`}
          className="aspect-[16/9] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-[#F1F6FB]">
          <p className="text-xs text-[#9AAFC1]">
            등록된 사진이 없어요.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-[#F4F7FC] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#53647E]">오염 등급</span>
          <strong className={`rounded-full px-2.5 py-1 text-xs ${drain.dirtLevel >= 3 ? 'bg-[#FDECEC] text-[#C85D5D]' : drain.dirtLevel >= 2 ? 'bg-[#FFF2D6] text-[#A87420]' : 'bg-[#EAF7EF] text-[#32865A]'}`}>{drain.dirtLevel} / 3</strong>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= drain.dirtLevel ? drain.dirtLevel >= 3 ? 'bg-[#E48787]' : drain.dirtLevel >= 2 ? 'bg-[#E9B34F]' : 'bg-[#70B89A]' : 'bg-[#E1E8F1]'}`} />)}
        </div>
      </div>
    </section>
  )
}
