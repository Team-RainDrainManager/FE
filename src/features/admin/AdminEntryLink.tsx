import { Link } from 'react-router'

import { isStaffRole, useMyRole } from './useMyRole'

/** 운영자 · 시군 담당자에게만 보이는 관리자 화면 바로가기 */
export default function AdminEntryLink() {
  const { role } = useMyRole()
  if (!isStaffRole(role)) return null

  return (
    <section className="dd-profile-panel">
      <Link to="/admin" className="flex min-h-11 items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold">관리자 화면</span>
          <span className="mt-0.5 block text-[13px] text-[var(--dd-muted)]">제보와 검토가 필요한 사진을 처리해요.</span>
        </span>
        <span aria-hidden="true" className="dd-profile-action shrink-0">열기 ›</span>
      </Link>
    </section>
  )
}
