import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getMe, type UserRole } from '../../apis/auth'
import { AccountId } from '../missions/wallet'

/** 관리자 화면에 들어갈 수 있는 역할인지 (운영자 · 시군 담당자) */
export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'CITY_OFFICIAL'
}

/**
 * 내 역할을 서버에서 확인합니다. 화면 표시용이며, 실제 권한 검사는 서버가 합니다.
 * role이 undefined이면 아직 확인 중이고, null이면 확인하지 못한 것입니다.
 */
export function useMyRole(): { role: UserRole | null | undefined; isPending: boolean } {
  const account = useContext(AccountId)
  const query = useQuery({
    queryKey: ['account', 'role', account],
    queryFn: getMe,
    select: (me) => me.role ?? 'USER',
    staleTime: 5 * 60_000,
  })
  return {
    role: query.isPending ? undefined : query.data ?? null,
    isPending: query.isPending,
  }
}
