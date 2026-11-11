import { useQuery } from '@tanstack/react-query'

import { isServerHealthy } from '../../apis/health'

/**
 * 서버에 연결되지 않을 때만 안내를 보여 줍니다 (GET /api/v1/health).
 * 연결되지 않는 동안에는 10초마다 다시 확인하고, 연결되면 안내가 사라집니다.
 */
export default function ServerStatusNotice({ className = '' }: { className?: string }) {
  const { data: healthy } = useQuery({
    queryKey: ['server-health'],
    queryFn: ({ signal }) => isServerHealthy(signal),
    staleTime: 30_000,
    retry: false,
    refetchInterval: (query) => (query.state.data === false ? 10_000 : false),
  })

  if (healthy !== false) return null

  return (
    <p role="status" className={className}>
      지금 서버에 연결할 수 없어요. 인터넷 연결을 확인하거나 잠시 뒤 다시 시도해 주세요. 연결되면 이 안내는 사라져요.
    </p>
  )
}
