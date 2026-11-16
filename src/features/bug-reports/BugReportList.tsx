import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getErrorMessage } from '../../apis/auth'
import {
  BUG_REPORT_CATEGORIES,
  BUG_REPORT_STATUSES,
  MY_BUG_REPORTS_QUERY_KEY,
  getMyBugReports,
  type BugReportPage,
  type BugReportSummary,
} from '../../apis/bug-reports'
import { formatKstDateTime } from '../../utils/kstDateTime'
import { AccountId } from '../account/AccountId'

function BugReportSummaryContent({ report }: { report: BugReportSummary }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 break-words text-sm font-bold">{report.title}</span>
        <span className="shrink-0 rounded-full bg-[var(--dd-subtle)] px-2 py-1 text-xs font-bold text-[var(--dd-blue)]">
          {BUG_REPORT_STATUSES[report.status]}
        </span>
      </span>
      <span className="mt-1 block break-words text-xs text-[var(--dd-muted)]">
        #{report.bugReportId} · {BUG_REPORT_CATEGORIES[report.category]} · {formatKstDateTime(report.createdAt) ?? '시각 정보 없음'}
        {report.reporterNickname && ` · ${report.reporterNickname}`}
      </span>
      <span className="mt-2 block whitespace-pre-wrap break-words text-sm leading-5 text-[var(--dd-muted)]">
        {report.content}
      </span>
      {report.resolvedAt && (
        <span className="mt-2 block text-xs text-[var(--dd-muted)]">
          처리 시각 {formatKstDateTime(report.resolvedAt) ?? '시각 정보 없음'}
        </span>
      )}
    </>
  )
}

export function BugReportList({ data, onPageChange, onSelect }: {
  data: BugReportPage
  onPageChange: (page: number) => void
  onSelect?: (reportId: number) => void
}) {
  const rowClass = 'block w-full rounded-2xl border border-[var(--dd-line)] bg-[var(--dd-surface)] p-3 text-left'
  return (
    <div className="space-y-3">
      {data.content.length > 0 ? (
        <ul className="space-y-2">
          {data.content.map((report) => (
            <li key={report.bugReportId}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(report.bugReportId)}
                  className={`${rowClass} focus-visible:outline-2 focus-visible:outline-[var(--dd-blue)]`}
                >
                  <BugReportSummaryContent report={report} />
                </button>
              ) : (
                <article className={rowClass}><BugReportSummaryContent report={report} /></article>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-sm text-[var(--dd-muted)]">접수된 버그 신고가 없어요.</p>}

      {(data.page > 0 || data.hasNext) && (
        <nav aria-label="버그 신고 페이지" className="flex items-center justify-between gap-2 text-xs">
          <button type="button" disabled={data.page === 0} onClick={() => onPageChange(data.page - 1)}
            className="min-h-11 rounded-xl bg-[var(--dd-subtle)] px-3 font-bold disabled:opacity-50">이전</button>
          <span>{data.page + 1} / {Math.max(1, data.totalPages)}</span>
          <button type="button" disabled={!data.hasNext} onClick={() => onPageChange(data.page + 1)}
            className="min-h-11 rounded-xl bg-[var(--dd-subtle)] px-3 font-bold disabled:opacity-50">다음</button>
        </nav>
      )}
    </div>
  )
}

export function MyBugReportsPanel({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const accountId = useContext(AccountId)
  const [page, setPage] = useState(0)
  const reports = useQuery({
    queryKey: [...MY_BUG_REPORTS_QUERY_KEY, accountId, page],
    queryFn: ({ signal }) => getMyBugReports(page, signal),
    enabled: accountId !== null,
  })

  return (
    <div className="space-y-3" aria-busy={reports.isFetching}>
      <div className="flex items-center justify-between gap-2">
        <h3 id="bug-report-title" className="text-lg font-extrabold">내 버그 신고 내역</h3>
        <button type="button" aria-label="닫기" onClick={onClose} className="min-h-11 min-w-11">✕</button>
      </div>
      <button type="button" onClick={onBack} className="min-h-10 text-sm font-bold text-[var(--dd-blue)]">
        ‹ 버그 신고로 돌아가기
      </button>
      {accountId === null ? (
        <p role="status" className="text-sm text-[var(--dd-muted)]">계정 정보를 확인하지 못했어요.</p>
      ) : reports.isPending ? (
        <p role="status" className="py-5 text-sm text-[var(--dd-muted)]">신고 내역을 불러오는 중이에요.</p>
      ) : reports.isError ? (
        <div role="alert" className="space-y-2 text-sm text-[#C65A62]">
          <p>{getErrorMessage(reports.error)}</p>
          <button type="button" onClick={() => void reports.refetch()} className="min-h-11 font-bold underline">다시 시도</button>
        </div>
      ) : <BugReportList data={reports.data} onPageChange={setPage} />}
    </div>
  )
}
