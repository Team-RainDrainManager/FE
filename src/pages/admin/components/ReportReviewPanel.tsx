import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  clearAdminReport,
  getAdminReports,
  reviewAdminReport,
  type AdminReportStatus,
  type AdminReportSummary,
} from '../../../apis/admin'
import { getErrorMessage } from '../../../apis/auth'
import { getReportDetail, type ReportType } from '../../../apis/reports'
import DecisionBar from './DecisionBar'
import { formatDateTime } from './format'

const TYPE_LABELS: Record<ReportType, string> = {
  BLOCKAGE: '막힘 제보',
  NEW_DRAIN: '새 빗물받이 제보',
  LOCATION_FIX: '위치 수정',
  REMOVAL: '삭제 요청',
  ODOR: '악취 제보',
}

const STATUS_LABELS: Record<AdminReportStatus, string> = {
  PENDING: '접수',
  APPROVED: '승인',
  REJECTED: '반려',
  CLEARED: '차단 해제',
}

const STATUS_STYLES: Record<AdminReportStatus, string> = {
  PENDING: 'bg-[#FFF4DC] text-[#8A6510]',
  APPROVED: 'bg-[#E5F7ED] text-[#1F7A55]',
  REJECTED: 'bg-[#FFF1F1] text-[#B84D4D]',
  CLEARED: 'bg-[#EAF2FF] text-[#3981F7]',
}

const FILTERS: { value: AdminReportStatus | null; label: string }[] = [
  { value: 'PENDING', label: '접수' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'CLEARED', label: '차단 해제' },
  { value: null, label: '전체' },
]

function ReportCard({ report }: { report: AdminReportSummary }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const detail = useQuery({
    queryKey: ['report-detail', report.reportId],
    queryFn: ({ signal }) => getReportDetail(report.reportId, signal),
    enabled: open,
    staleTime: 30_000,
  })

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
    queryClient.invalidateQueries({ queryKey: ['report-detail', report.reportId] }),
    queryClient.invalidateQueries({ queryKey: ['map-drains'] }),
    queryClient.invalidateQueries({ queryKey: ['drain-detail'] }),
  ])

  const review = useMutation({
    mutationFn: ({ approved, comment }: { approved: boolean; comment: string }) =>
      reviewAdminReport(report.reportId, approved, comment),
    onSuccess: refresh,
  })

  const clear = useMutation({
    mutationFn: (comment: string) => clearAdminReport(report.reportId, comment),
    onSuccess: refresh,
  })

  const canClear = report.status === 'APPROVED' && report.blocksAdoption

  return (
    <li className="rounded-[22px] border border-[#E2EAF4] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-6 text-[#203451]">
            {TYPE_LABELS[report.type] ?? '제보'} <span className="font-medium text-[#637790]">#{report.reportId}</span>
          </h3>
          <p className="mt-0.5 text-[13px] leading-5 text-[#637790]">{formatDateTime(report.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${STATUS_STYLES[report.status]}`}>
          {STATUS_LABELS[report.status] ?? report.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
        {report.drainId !== null && (
          <Link to={`/drains/${report.drainId}`} className="font-bold text-[#3981F7]">
            빗물받이 #{report.drainId} 보기 ›
          </Link>
        )}
        {report.blocksAdoption && (
          <span className="rounded-full bg-[#FFF1F1] px-2 py-0.5 text-[12px] font-bold text-[#B84D4D]">입양 차단 중</span>
        )}
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 min-h-11 w-full rounded-xl bg-[#F4F7FB] text-[14px] font-bold text-[#53647E]"
      >
        {open ? '접기' : '사진과 내용 보기'}
      </button>

      {open && (
        <div className="mt-3">
          {detail.isPending && <p role="status" className="text-[13px] text-[#637790]">제보 내용을 불러오는 중이에요.</p>}
          {detail.isError && (
            <p role="alert" className="text-[13px] leading-5 text-[#B84D4D]">
              {getErrorMessage(detail.error)}
              <button type="button" className="ml-2 font-bold underline" onClick={() => void detail.refetch()}>다시 시도</button>
            </p>
          )}
          {detail.data && (
            <div className="space-y-2">
              {detail.data.photoUrl ? (
                <a href={detail.data.photoUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={detail.data.photoUrl} alt="제보 사진" loading="lazy" className="max-h-64 w-full rounded-xl bg-[#F4F7FB] object-contain" />
                </a>
              ) : (
                <p className="rounded-xl bg-[#F4F7FB] p-3 text-[13px] text-[#637790]">첨부한 사진이 없어요.</p>
              )}
              <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-[#203451]">
                {detail.data.description?.trim() || '적은 내용이 없어요.'}
              </p>
              {detail.data.newLatitude != null && detail.data.newLongitude != null && (
                <p className="text-[13px] leading-5 text-[#637790]">
                  새 위치: {detail.data.newLatitude.toFixed(5)}, {detail.data.newLongitude.toFixed(5)}
                </p>
              )}
              {detail.data.adminComment && (
                <p className="rounded-xl bg-[#F4F7FB] p-3 text-[13px] leading-5 text-[#53647E]">
                  처리 메모: {detail.data.adminComment}
                </p>
              )}
            </div>
          )}

          {report.status === 'PENDING' && (
            <DecisionBar
              commentLabel="처리 메모 (제보자에게 보여요)"
              busy={review.isPending}
              error={review.isError ? getErrorMessage(review.error) : ''}
              onDecide={(decision, comment) => review.mutate({ approved: decision === 'approve', comment })}
            />
          )}

          {canClear && (
            <div className="mt-3 rounded-xl bg-[#F4F7FB] p-3">
              <p className="text-[13px] leading-5 text-[#53647E]">
                현장 정비가 끝났다면 차단을 풀어 주세요. 지도에서 막힘 표시가 사라지고 다시 입양할 수 있어요.
              </p>
              {clear.isError && <p role="alert" className="mt-2 text-[13px] text-[#B84D4D]">{getErrorMessage(clear.error)}</p>}
              <button
                type="button"
                disabled={clear.isPending}
                onClick={() => clear.mutate('현장 정비 완료')}
                className="mt-2 min-h-11 w-full rounded-xl bg-[#3981F7] text-[14px] font-bold text-white disabled:opacity-50"
              >
                {clear.isPending ? '해제하는 중…' : '입양 차단 해제'}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** 관리자 화면의 제보 탭. 제보를 승인 · 반려하고, 정비가 끝난 막힘 제보의 입양 차단을 풉니다. */
export default function ReportReviewPanel() {
  const [status, setStatus] = useState<AdminReportStatus | null>('PENDING')
  const reports = useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: ({ signal }) => getAdminReports(status, signal),
    staleTime: 15_000,
  })

  return (
    <section aria-label="제보 처리">
      <div role="group" aria-label="제보 상태" className="flex flex-wrap gap-1.5">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={status === filter.value}
            onClick={() => setStatus(filter.value)}
            className={`min-h-10 rounded-full border px-3.5 text-[13px] font-bold ${
              status === filter.value
                ? 'border-[#3981F7] bg-[#3981F7] text-white'
                : 'border-[#E2EAF4] bg-white text-[#53647E]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {reports.isPending ? (
        <p role="status" className="py-8 text-center text-[14px] text-[#637790]">제보를 불러오는 중이에요.</p>
      ) : reports.isError ? (
        <div role="alert" className="py-8 text-center text-[14px] text-[#B84D4D]">
          <p>{getErrorMessage(reports.error)}</p>
          <button type="button" onClick={() => void reports.refetch()} className="mt-3 min-h-11 rounded-xl bg-[#EAF2FF] px-4 font-bold text-[#3981F7]">다시 시도</button>
        </div>
      ) : reports.data.length === 0 ? (
        <p className="py-10 text-center text-[14px] leading-6 text-[#637790]">
          {status === 'PENDING' ? '처리할 제보가 없어요.' : '해당하는 제보가 없어요.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reports.data.map((report) => <ReportCard key={report.reportId} report={report} />)}
        </ul>
      )}
    </section>
  )
}
