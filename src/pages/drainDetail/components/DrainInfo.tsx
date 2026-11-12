import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useKakaoLoader } from 'react-kakao-maps-sdk'

import type { DrainDetailDto } from '../../../types/drainDetail'

const STATUS_LABELS = {
  ACTIVE: '등록 완료',
  PENDING: '등록 대기',
  REMOVED: '삭제 처리',
}

type Coordinates = {
  drainId: number
  latitude: number
  longitude: number
}

// 상세 페이지를 직접 열어도 카카오 services SDK를 불러와 주소를 조회합니다.
function CoordinateAddress({
  drainId,
  latitude,
  longitude,
  appKey,
}: Coordinates & { appKey: string }) {
  const [loading, loadError] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services'],
  })

  const servicesReady =
    !loading &&
    !loadError &&
    typeof kakao !== 'undefined' &&
    Boolean(kakao.maps.services?.Geocoder)

  const { data: address, isFetching } = useQuery<string | null>({
    queryKey: ['drain-coordinate-address', drainId, latitude, longitude],
    enabled: servicesReady,
    staleTime: 60 * 60 * 1000,
    retry: 0,
    queryFn: () =>
      new Promise<string | null>((resolve, reject) => {
        try {
          const geocoder = new kakao.maps.services.Geocoder()

          // 카카오맵 역지오코딩 순서: 경도(x), 위도(y)
          geocoder.coord2Address(longitude, latitude, (results, status) => {
            if (status !== kakao.maps.services.Status.OK || !results[0]) {
              resolve(null)
              return
            }

            const location = results[0]
            resolve(
              location.road_address?.address_name ||
                location.address?.address_name ||
                null,
            )
          })
        } catch (error) {
          reject(error)
        }
      }),
  })

  const coordinateFallback =
    `위도 ${latitude.toFixed(5)} · 경도 ${longitude.toFixed(5)}`

  return (
    <span>
      {address ||
        (loading || isFetching
          ? '주소 확인 중...'
          : coordinateFallback)}
    </span>
  )
}

export default function DrainInfo({
  drain,
}: {
  drain: DrainDetailDto
}) {
  const adopted = drain.adoptionStatus === 'ADOPTED'

  // 상세 응답에 주소가 포함되면 그대로 쓰고, 없을 때만 좌표로 변환합니다.
  const serverAddress =
    'address' in drain && typeof drain.address === 'string'
      ? drain.address.trim()
      : ''

  const hasServerAddress =
    Boolean(serverAddress) && serverAddress !== '주소 정보 없음'

  const hasValidCoordinates =
    Number.isFinite(drain.latitude) &&
    Number.isFinite(drain.longitude) &&
    Math.abs(drain.latitude) <= 90 &&
    Math.abs(drain.longitude) <= 180

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY?.trim() ?? ''

  return (
    <section className="bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#EEF4FA] px-3 py-1 text-[11px] font-bold text-[#728CA4]">
          {STATUS_LABELS[drain.status]}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            adopted
              ? 'bg-[#E8F7EF] text-[#259B68]'
              : 'bg-[#F2F4F7] text-[#8493A5]'
          }`}
        >
          {adopted ? '입양 중' : '미입양'}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-extrabold text-[#203451]">
        {drain.adoption?.nickname ?? `빗물받이 #${drain.id}`}
      </h2>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EDF1F6] pt-3">
        <p className="min-w-0 flex-1 text-[11px] leading-5 text-[#78899F]">
          위치{' '}
          {hasServerAddress ? (
            serverAddress
          ) : hasValidCoordinates && appKey ? (
            <CoordinateAddress
              drainId={drain.id}
              latitude={drain.latitude}
              longitude={drain.longitude}
              appKey={appKey}
            />
          ) : hasValidCoordinates ? (
            `위도 ${drain.latitude.toFixed(5)} · 경도 ${drain.longitude.toFixed(5)}`
          ) : (
            '위치 정보 없음'
          )}
        </p>
        <Link
          to="/map"
          className="shrink-0 rounded-full bg-[#EAF2FF] px-3 py-2 text-xs font-semibold text-[#3981F7]"
        >
          지도 보기 ›
        </Link>
      </div>
    </section>
  )
}
