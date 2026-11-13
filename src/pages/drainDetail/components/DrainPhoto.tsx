import type { DrainDetailDto } from '../../../types/drainDetail'
import { dirtLevelLabel } from '../../../utils/dirtGrade'

export default function DrainPhoto({ drain }: { drain: DrainDetailDto }) {
  const { photoUrl, dirtLevel } = drain
  const tone =
    dirtLevel >= 3
      ? { badge: 'bg-[#FDECEC] [html[data-dd-theme=dark]_&]:bg-[#4a2834] text-[#A63F3F] [html[data-dd-theme=dark]_&]:text-[#ffc9d2]', bar: 'bg-[#E48787]' }
      : dirtLevel >= 2
        ? { badge: 'bg-[#FFF2D6] [html[data-dd-theme=dark]_&]:bg-[#40321f] text-[#81560F] [html[data-dd-theme=dark]_&]:text-[#ffda98]', bar: 'bg-[#E9B34F]' }
        : { badge: 'bg-[#E9F6EF] [html[data-dd-theme=dark]_&]:bg-[#203b34] text-[#24765A] [html[data-dd-theme=dark]_&]:text-[#8fe0b8]', bar: 'bg-[#70AE94]' }

  return (
    <section aria-label="현장 사진">
      <h3 className="mx-px mb-[11px] text-base font-extrabold tracking-tight text-[#17344C] [html[data-dd-theme=dark]_&]:text-[var(--dd-ink)]">
        현장 사진
      </h3>

      <div className="rounded-[22px] border border-[#DFEBF3] bg-[var(--dd-surface)] p-3 shadow-[0_10px_30px_rgba(40,81,111,0.055)]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="빗물받이 현장 사진"
            loading="lazy"
            className="block aspect-video w-full rounded-xl object-cover"
          />
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl bg-[#F1F6FB]">
            <p className="text-xs text-[#637790]">등록된 사진이 없어요.</p>
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-[#F5F9FC] px-2.5 py-2">
          <span className="text-xs font-semibold text-[#53647E]">오염 등급</span>
          <strong className={`rounded-full px-2 py-1 text-[11px] ${tone.badge}`}>
            {dirtLevelLabel(dirtLevel)}
          </strong>
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  step <= dirtLevel ? tone.bar : 'bg-[#DFEBF3] [html[data-dd-theme=dark]_&]:bg-[var(--dd-line)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
