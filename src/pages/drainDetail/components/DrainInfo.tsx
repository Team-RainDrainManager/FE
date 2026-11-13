import { useQuery } from '@tanstack/react-query'
import { useKakaoLoader } from 'react-kakao-maps-sdk'

import type { DrainDetailDto } from '../../../types/drainDetail'

type CoordinateAddressProps = {
  drainId: number
  latitude: number
  longitude: number
  appKey: string
}

function CoordinateAddress({
  drainId,
  latitude,
  longitude,
  appKey,
}: CoordinateAddressProps) {
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

  const fallback = `위도 ${latitude.toFixed(5)} · 경도 ${longitude.toFixed(5)}`
  return <>{address || (loading || isFetching ? '주소 확인 중...' : fallback)}</>
}

export default function DrainInfo({ drain }: { drain: DrainDetailDto }) {
  const address =
    'address' in drain && typeof drain.address === 'string'
      ? drain.address.trim()
      : ''
  const hasAddress = Boolean(address) && address !== '주소 정보 없음'
  const hasCoordinates =
    Number.isFinite(drain.latitude) &&
    Number.isFinite(drain.longitude) &&
    Math.abs(drain.latitude) <= 90 &&
    Math.abs(drain.longitude) <= 180
  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY?.trim() ?? ''

  return (
    <section
      aria-label="빗물받이 위치"
      className="mt-[13px] flex items-center gap-[11px] rounded-[18px] border border-[#DFEBF3] bg-white px-4 py-3.5 shadow-[0_10px_30px_rgba(40,81,111,0.055)]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EFF5F9] text-[#49758D]">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>

      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#536A7A]">빗물받이 위치</p>
        <p className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-[#213B4C]">
          {hasAddress ? (
            address
          ) : hasCoordinates && appKey ? (
            <CoordinateAddress
              drainId={drain.id}
              latitude={drain.latitude}
              longitude={drain.longitude}
              appKey={appKey}
            />
          ) : hasCoordinates ? (
            `위도 ${drain.latitude.toFixed(5)} · 경도 ${drain.longitude.toFixed(5)}`
          ) : (
            '위치 정보 없음'
          )}
        </p>
      </div>
    </section>
  )
}