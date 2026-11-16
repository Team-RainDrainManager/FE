import { useContext, useState, type FormEvent } from 'react'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '../../../apis/auth'
import {
  BUG_REPORT_CATEGORIES,
  BUG_REPORT_STATUSES,
  MY_BUG_REPORTS_QUERY_KEY,
  getAdminBugReport,
  getAdminBugReports,
  updateAdminBugReport,
  type AdminBugReportDetail,
  type BugReportStatus,
  type BugReportUpdate,
} from '../../../apis/bug-reports'
import { AccountId } from '../../../features/account/AccountId'
import { BugReportList } from '../../../features/bug-reports/BugReportList'
import { formatKstDateTime } from '../../../utils/kstDateTime'

const LIST_KEY = ['admin', 'bug-reports'] as const
const secondaryButton = 'min-h-11 rounded-xl bg-[var(--dd-subtle)] px-3 text-sm font-bold text-[var(--dd-blue)]'
const fieldClass = 'w-full rounded-xl border border-[var(--dd-line)] bg-[var(--dd-surface)] px-3 py-2 text-sm'

function BugReportEditor({ report, detailKey }: {
  report: AdminBugReportDetail
  detailKey: readonly ['admin', 'bug-report-detail', number | null, number]
}) {
  const queryClient = useQueryClient()
  const [changes, setChanges] = useState<BugReportUpdate>({})
  const status = changes.status ?? report.status
  const note = changes.adminNote ?? report.adminNote ?? ''
  const saveKey = [...detailKey, 'save'] as const
  const isSaving = useIsMutating({ mutationKey: saveKey, exact: true }) > 0

  const save = useMutation({
    mutationKey: saveKey,
    mutationFn: (update: BugReportUpdate) => updateAdminBugReport(report.bugReportId, update),
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: detailKey, exact: true })
      queryClient.setQueryData(detailKey, updated)
      setChanges({})
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LIST_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_BUG_REPORTS_QUERY_KEY }),
      ])
    },
  })

  const hasChange = status !== report.status || note !== (report.adminNote ?? '')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChange || queryClient.isMutating({ mutationKey: saveKey, exact: true })) return

    save.mutate({
      ...(status !== report.status ? { status } : {}),
      ...(note !== (report.adminNote ?? '') ? { adminNote: note } : {}),
    })
  }

  const metadata = [
    { label: '신고 화면', value: report.screen },
    { label: '요청 ID', value: report.requestId },
    { label: '앱 버전', value: report.appVersion },
    { label: '플랫폼', value: report.platform },
    { label: '브라우저 정보', value: report.userAgent },
    { label: '처리자', value: report.resolvedByNickname },
    { label: '처리 시각', value: formatKstDateTime(report.resolvedAt) },
  ].filter((item) => item.value)

  return (
    <article className="space-y-4 rounded-2xl border border-[var(--dd-line)] bg-[var(--dd-surface)] p-4">
      <div>
        <h3 className="break-words text-base font-extrabold">{report.title}</h3>
        <p className="mt-1 text-xs text-[var(--dd-muted)]">
          #{report.bugReportId} · {BUG_REPORT_CATEGORIES[report.category]} · {report.reporterNickname ?? '신고자 정보 없음'}
        </p>
        <p className="mt-1 text-xs text-[var(--dd-muted)]">{formatKstDateTime(report.createdAt) ?? '시각 정보 없음'}</p>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{report.content}</p>

      {metadata.length > 0 && (
        <dl className="space-y-1 break-words rounded-xl bg-[var(--dd-subtle)] p-3 text-xs text-[var(--dd-muted)]">
          {metadata.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
              <dt className="font-bold">{label}</dt><dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {report.photoUrls?.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {report.photoUrls.filter(Boolean).map((url, index) => (
            <a key={`${url}:${index}`} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`신고 스크린샷 ${index + 1}`} loading="lazy"
                className="aspect-square w-full rounded-xl object-cover" />
            </a>
          ))}
        </div>
      )}

      <form onSubmit={submit}>
        <fieldset disabled={isSaving} className="space-y-3">
          <label className="block space-y-1 text-xs font-bold">
            <span>처리 상태</span>
            <select className={fieldClass} value={status}
              onChange={(event) => setChanges({ ...changes, status: event.target.value as BugReportStatus })}>
              {Object.entries(BUG_REPORT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-bold">
            <span>관리자 메모</span>
            <textarea className={fieldClass} rows={4} maxLength={1000} value={note}
              onChange={(event) => setChanges({ ...changes, adminNote: event.target.value })} />
          </label>
          {save.isError && <p role="alert" className="text-sm text-[#C65A62]">{getErrorMessage(save.error)}</p>}
          {save.isSuccess && !hasChange && <p role="status" className="text-sm text-[var(--dd-blue)]">처리 내용을 저장했어요.</p>}
          <button type="submit" disabled={isSaving || !hasChange}
            className="min-h-11 w-full rounded-xl bg-[#3981F7] px-3 text-sm font-bold text-white disabled:opacity-50">
            {isSaving ? '저장 중…' : '처리 내용 저장'}
          </button>
        </fieldset>
      </form>
    </article>
  )
}

function BugReportDetail({ accountId, reportId, onBack }: {
  accountId: number | null
  reportId: number
  onBack: () => void
}) {
  const detailKey = ['admin', 'bug-report-detail', accountId, reportId] as const
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => getAdminBugReport(reportId, signal),
  })

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className={secondaryButton}>‹ 신고 목록으로</button>
      {detail.data ? (
        <BugReportEditor report={detail.data} detailKey={detailKey} />
      ) : detail.isError ? (
        <div role="alert" className="space-y-2 text-sm text-[#C65A62]">
          <p>{getErrorMessage(detail.error)}</p>
          <button type="button" onClick={() => void detail.refetch()} className={secondaryButton}>다시 시도</button>
        </div>
      ) : <p role="status" className="text-sm text-[var(--dd-muted)]">버그 신고 상세를 불러오는 중이에요.</p>}
    </div>
  )
}

export default function BugReportReviewPanel() {
  const accountId = useContext(AccountId)
  const [page, setPage] = useState(0)
  const [reportId, setReportId] = useState<number | null>(null)
  const reports = useQuery({
    queryKey: [...LIST_KEY, accountId, page],
    queryFn: ({ signal }) => getAdminBugReports(page, signal),
    enabled: reportId === null,
  })

  return (
    <section aria-label="앱 버그 신고 관리" className="text-[var(--dd-ink)]">
      {reportId !== null ? (
        <BugReportDetail key={reportId} accountId={accountId} reportId={reportId} onBack={() => setReportId(null)} />
      ) : reports.isPending ? (
        <p role="status" className="py-6 text-sm text-[var(--dd-muted)]">버그 신고 목록을 불러오는 중이에요.</p>
      ) : reports.isError ? (
        <div role="alert" className="space-y-2 py-4 text-sm text-[#C65A62]">
          <p>{getErrorMessage(reports.error)}</p>
          <button type="button" onClick={() => void reports.refetch()} className={secondaryButton}>다시 시도</button>
        </div>
      ) : <BugReportList data={reports.data} onPageChange={setPage} onSelect={setReportId} />}
    </section>
  )
}
