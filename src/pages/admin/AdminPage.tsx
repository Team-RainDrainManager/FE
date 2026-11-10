import { useState } from 'react'
import { Link } from 'react-router'

import { isStaffRole, useMyRole } from '../../features/admin/useMyRole'
import PhotoReviewPanel from './components/PhotoReviewPanel'
import ReportReviewPanel from './components/ReportReviewPanel'

type Tab = 'reports' | 'reviews'

const TABS: { id: Tab; label: string }[] = [
  { id: 'reports', label: '제보' },
  { id: 'reviews', label: '사진 검토' },
]

/**
 * 운영자 · 시군 담당자가 쓰는 관리 화면입니다.
 * 주민이 올린 제보와, AI가 확신하지 못한 점검 사진을 사람이 확인해 처리합니다.
 */
export default function AdminPage() {
  const { role, isPending } = useMyRole()
  const [tab, setTab] = useState<Tab>('reports')

  if (isPending) {
    return (
      <div role="status" className="px-5 py-16 text-center text-[14px] text-[#637790]">
        권한을 확인하고 있어요.
      </div>
    )
  }

  if (!isStaffRole(role)) {
    return (
      <div className="break-keep px-5 py-16 text-center">
        <h2 className="text-[16px] font-bold text-[#203451]">관리자 전용 화면이에요</h2>
        <p className="mt-2 text-[14px] leading-6 text-[#637790]">
          운영자와 시군 담당자 계정으로 로그인하면 볼 수 있어요.
        </p>
        <Link
          to="/profile"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3981F7] px-5 text-[14px] font-bold text-white"
        >
          프로필로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="break-keep min-h-[calc(100dvh-128px)] bg-[#F4F7FC] px-4 pb-8 pt-4 text-[#203451]">
      <p className="px-1 text-[14px] leading-6 text-[#53647E]">
        주민이 올린 제보와, AI가 확신하지 못한 사진을 확인해 처리해요.
      </p>

      <div role="tablist" aria-label="관리 종류" className="mb-4 mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-[#EAF2FF] p-1">
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              id={`admin-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`admin-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`min-h-11 rounded-xl border text-[15px] font-bold ${
                active
                  ? 'border-[#C6DCFF] bg-white text-[#3981F7]'
                  : 'border-transparent text-[#53647E]'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div id={`admin-panel-${tab}`} role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        {tab === 'reports' ? <ReportReviewPanel /> : <PhotoReviewPanel />}
      </div>
    </div>
  )
}
