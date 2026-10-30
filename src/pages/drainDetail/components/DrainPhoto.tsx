
import type { DrainDetailDto } from '../../../types/drainDetail'

export default function DrainPhoto({
  drain,
}: {
  drain: DrainDetailDto
}) {
  return (
    <section className="rounded-[20px] border border-[#E7EFF7] bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-[#24496B]">
        빗물받이 사진
      </h3>

      {drain.photoUrl ? (
        <img
          src={drain.photoUrl}
          alt={`빗물받이 ${drain.id}번 사진`}
          className="h-[180px] w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-[180px] items-center justify-center rounded-xl bg-[#F1F6FB]">
          <p className="text-xs text-[#9AAFC1]">
            등록된 사진이 없어요.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-[#607C99]">
          오염 등급
        </span>

        <strong className="text-sm text-[#3489DC]">
          {drain.dirtLevel} / 3
        </strong>
      </div>

      <p className="mt-2 text-[10px] text-[#9AAFC1]">
        상세 API의 photoUrl과 dirtLevel을 표시합니다.
      </p>
    </section>
  )
}
