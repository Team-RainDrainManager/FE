
import type { RankingRow } from '../../../types/social'

interface RankingListProps {
  rows: RankingRow[]
  emptyMessage?: string
}

const RANK_COLORS = [
  'bg-[#FFF3CD] text-[#A87916]',
  'bg-[#E9F1F6] text-[#71899A]',
  'bg-[#F9EADB] text-[#AC7954]',
]

export default function RankingList({
  rows,
  emptyMessage = '아직 순위 데이터가 없어요.',
}: RankingListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E8EDF5] bg-white px-5 py-12 text-center text-sm text-[#78899F]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ol className="overflow-hidden rounded-[24px] border border-[#E8EDF5] bg-white">
      {rows.map((row, index) => (
        <li
          key={row.id}
          className={`
            flex min-w-0 items-center gap-2.5 border-b border-[#EDF1F6] px-3 py-3.5 last:border-b-0 transition-colors
            ${
              row.isMe
                ? 'bg-[#EAF2FF]'
                : 'bg-white'
            }
          `}
        >
          <span
            className={`
              flex h-9 w-9 shrink-0 items-center
              justify-center rounded-xl text-sm font-extrabold
              ${
                RANK_COLORS[index] ??
                'bg-[#F0F5FA] text-[#7B8FA1]'
              }
            `}
          >
            {index + 1}
          </span>

          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F5F1] text-xl"
          >
            {row.avatar}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <strong className="truncate text-[13px] text-[#203451]">
                {row.name}
              </strong>

              {row.isMe && (
                <span className="shrink-0 rounded-md bg-[#D7EBFF] px-1.5 py-0.5 text-[10px] font-bold text-[#3981F7]">
                  나
                </span>
              )}
            </div>

            {row.subtitle && (
              <p className="mt-1 truncate text-[11px] text-[#78899F]">
                {row.subtitle}
              </p>
            )}
          </div>

          <strong className="shrink-0 text-sm font-bold tabular-nums text-[#3981F7]">
            {row.score.toLocaleString('ko-KR')}
            <span className="ml-0.5 text-[11px] font-medium">
              점
            </span>
          </strong>
        </li>
      ))}
    </ol>
  )
}
