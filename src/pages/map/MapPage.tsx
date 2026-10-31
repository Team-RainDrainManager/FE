
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CustomOverlayMap,
  Map,
  useKakaoLoader,
} from 'react-kakao-maps-sdk'

import { getMockDrainsInBounds, MOCK_MAP_DRAINS } from '../../mocks/map'
import type {
  DrainMapFilter,
  DrainMapItem,
  MapBoundsParams,
} from '../../types/map'

import DrainMarker from './components/DrainMarker'
import DrainListPanel from './components/DrainListPanel'
import ReportDraftModal from './components/ReportDraftModal'

const DEFAULT_CENTER = {
  lat: 37.4884,
  lng: 126.8042,
}

const DEFAULT_LEVEL = 4

const FILTERS: { value: DrainMapFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'unadopted', label: '미입양' },
  { value: 'normal', label: '정상' },
  { value: 'overdue', label: '점검 지연' },
  { value: 'blocked', label: '막힘 제보' },
]

const FILTER_DOTS: Record<DrainMapFilter, string> = {
  all: 'bg-[#6FAEFF]',
  unadopted: 'bg-[#98A2B3]',
  normal: 'bg-[#4FBAA1]',
  overdue: 'bg-[#F5B84B]',
  blocked: 'bg-[#EF7272]',
}
const FILTER_ACTIVE_STYLES: Record<DrainMapFilter, string> = {
  all: 'border-[#6FAEFF] bg-[#6FAEFF] text-white',
  unadopted: 'border-[#B4BDC8] bg-[#B4BDC8] text-white',
  normal: 'border-[#62C19C] bg-[#62C19C] text-white',
  overdue: 'border-[#F0C24F] bg-[#F0C24F] text-white',
  blocked: 'border-[#E97C7C] bg-[#E97C7C] text-white',
}

const STATUS_LABELS = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
}

interface Position {
  lat: number
  lng: number
}

function readMapBounds(map: kakao.maps.Map): MapBoundsParams {
  const bounds = map.getBounds()
  const southwest = bounds.getSouthWest()
  const northeast = bounds.getNorthEast()

  return {
    minLatitude: southwest.getLat(),
    maxLatitude: northeast.getLat(),
    minLongitude: southwest.getLng(),
    maxLongitude: northeast.getLng(),
  }
}

function hasSameBounds(
  previous: MapBoundsParams,
  next: MapBoundsParams,
): boolean {
  const tolerance = 0.0000001

  return (
    Math.abs(previous.minLatitude - next.minLatitude) < tolerance &&
    Math.abs(previous.maxLatitude - next.maxLatitude) < tolerance &&
    Math.abs(previous.minLongitude - next.minLongitude) < tolerance &&
    Math.abs(previous.maxLongitude - next.maxLongitude) < tolerance
  )
}

function KakaoMapContent({ appKey }: { appKey: string }) {
  const navigate = useNavigate()

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
  })

  const mapRef = useRef<kakao.maps.Map | null>(null)

  const [bounds, setBounds] = useState<MapBoundsParams | null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DrainMapFilter>('all')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const [currentPosition, setCurrentPosition] =
    useState<Position | null>(null)

  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')

  // 지도 영역이 변경될 때만 React 상태를 업데이트
  const updateBounds = useCallback((map: kakao.maps.Map) => {
    const nextBounds = readMapBounds(map)

    setBounds((previous) => {
      if (previous && hasSameBounds(previous, nextBounds)) {
        return previous
      }

      return nextBounds
    })
  }, [])

  // onCreate 참조가 렌더링마다 변경되지 않도록 고정
  const handleMapCreate = useCallback(
    (map: kakao.maps.Map) => {
      mapRef.current = map
      updateBounds(map)
    },
    [updateBounds],
  )

  const handleMapClick = useCallback(() => {
    setSelectedId(null)
  }, [])

  // 검색 + 상태별 필터
  const filteredDrains = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return MOCK_MAP_DRAINS.filter((drain) => {
      const matchesStatus =
        filter === 'all' || drain.status === filter

      const searchableText = [
        drain.name,
        drain.address,
        drain.nickname ?? '',
        String(drain.id),
      ]
        .join(' ')
        .toLowerCase()

      const matchesQuery =
        !keyword || searchableText.includes(keyword)

      return matchesStatus && matchesQuery
    })
  }, [filter, query])

  // 실제 지도 화면 안에 들어온 마커만 렌더링
  const visibleDrains = useMemo(() => {
    if (!bounds) return []

    return getMockDrainsInBounds(filteredDrains, bounds)
  }, [bounds, filteredDrains])

  const selectedDrain =
    MOCK_MAP_DRAINS.find((drain) => drain.id === selectedId) ??
    null

  // 마커 또는 목록에서 빗물받이 선택
  const handleSelectDrain = (drain: DrainMapItem) => {
    setSelectedId(drain.id)
    setListOpen(false)
    setNotice('')

    mapRef.current?.panTo(
      new kakao.maps.LatLng(drain.latitude, drain.longitude),
    )
  }

  // 실제 사용자 위치로 이동
  const moveToMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice('위치 정보를 지원하지 않는 브라우저예요.')
      return
    }

    setLocating(true)
    setNotice('')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = {
          lat: coords.latitude,
          lng: coords.longitude,
        }

        setCurrentPosition(position)

        const map = mapRef.current

        if (map) {
          map.setCenter(
            new kakao.maps.LatLng(
              position.lat,
              position.lng,
            ),
          )
          map.setLevel(3)
        }

        setSelectedId(null)
        setLocating(false)
      },
      (positionError) => {
        setNotice(
          positionError.code === 1
            ? '브라우저에서 위치 권한을 허용해 주세요.'
            : '현재 위치를 확인하지 못했어요.',
        )
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    )
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (filteredDrains.length === 0) {
      setNotice('검색 결과가 없어요.')
      return
    }

    handleSelectDrain(filteredDrains[0])
  }

  const handleReportComplete = () => {
    setReportOpen(false)
    setNotice(
      '제보 입력을 확인했어요. 목데이터 시연용이라 서버에는 저장되지 않습니다.',
    )
  }

  return (
    <main
      className="relative w-full overflow-hidden bg-[#F3F6FA]"
      style={{
        height:
          'calc(100dvh - 128px - env(safe-area-inset-bottom))',
        minHeight: 420,
      }}
    >
      {/* 하단 컨트롤 114px을 제외한 지도 영역: 검색창은 지도 위에 표시 */}
      <div className="absolute inset-x-0 bottom-[114px] top-0">
      {/* 지도 로딩 및 오류 상태 */}
      {error ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-base font-bold text-[#284B66]">
            카카오맵을 불러오지 못했어요.
          </p>
          <p className="mt-2 text-sm text-[#8294A5]">
            JavaScript 키와 등록한 도메인을 확인해 주세요.
          </p>
        </div>
      ) : loading ? (
        <div className="flex h-full items-center justify-center text-sm text-[#8294A5]">
          지도를 불러오는 중...
        </div>
      ) : (
        <Map
          center={DEFAULT_CENTER}
          level={DEFAULT_LEVEL}
          className="h-full w-full"
          onCreate={handleMapCreate}
          onIdle={updateBounds}
          onClick={handleMapClick}
        >
          {visibleDrains.map((drain) => (
            <DrainMarker
              key={drain.id}
              drain={drain}
              selected={selectedId === drain.id}
              onSelect={handleSelectDrain}
            />
          ))}

          {/* 현재 위치 표시 */}
          {currentPosition && (
            <CustomOverlayMap
              position={currentPosition}
              clickable
              xAnchor={0.5}
              yAnchor={0.5}
              zIndex={30}
            >
              <span
                aria-label="현재 위치"
                role="img"
                className="block h-4 w-4 rounded-full border-[3px] border-white bg-[#338CF0] shadow-[0_0_0_7px_rgba(51,140,240,0.18)]"
              />
            </CustomOverlayMap>
          )}
        </Map>
      )}

      </div>

      {!loading && !error && (
        <>
          {/* 지도 위에 떠 있는 전체 너비 검색창 */}
          <section
            aria-label="지도 검색"
            className="absolute inset-x-3 top-3 z-10"
          >
              <form
                onSubmit={handleSearch}
                className="flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl border border-[#E8EDF5] bg-white pl-3 pr-2 shadow-[0_4px_16px_rgba(23,43,77,0.12)] transition focus-within:border-[#8DB8FF] focus-within:ring-2 focus-within:ring-[#EAF2FF]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-[18px] w-[18px] shrink-0 text-[#8795AA]">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setSelectedId(null)
                  }}
                  placeholder="역곡동 · 빗물받이 검색"
                  aria-label="위치 또는 빗물받이 검색"
                  className="w-full min-w-0 flex-1 bg-transparent text-xs font-medium text-[#203451] outline-none placeholder:text-[#94A1B5]"
                />
                <button type="submit" className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-[#3981F7] transition hover:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-[#3981F7]">
                  검색
                </button>
              </form>
          </section>

          {/* 지도 오른쪽 위에 떠 있는 목록 버튼 */}
              <button
                type="button"
                onClick={() => setListOpen(true)}
                aria-expanded={listOpen}
                className="absolute right-3 top-[72px] z-10 flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-[#E8EDF5] bg-white px-3 text-xs font-bold text-[#203451] shadow-[0_4px_14px_rgba(23,43,77,0.12)] transition hover:bg-[#F8FAFD] active:scale-[0.98]"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-4 w-4">
                  <path d="M4 5h12M4 10h12M4 15h12" />
                </svg>
                <span>{filteredDrains.length}개 목록</span>
              </button>

          {/* 알림 또는 안내 */}
          {notice && (
            <div
              role="status"
              className="absolute left-3 right-3 top-[124px] z-20 flex items-center justify-between gap-2 rounded-2xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs leading-relaxed text-[#53647E] shadow-[0_8px_24px_rgba(23,43,77,0.10)]"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="안내 닫기"
                className="text-lg text-[#93A2AF]"
              >
                ×
              </button>
            </div>
          )}

          {/* 선택한 빗물받이 정보 카드 */}
          {selectedDrain && (
            <div className="absolute bottom-[202px] left-3 right-3 z-20 max-h-[calc(100%-286px)] overflow-y-auto rounded-[24px] border border-[#E8EDF5] bg-white p-4 shadow-[0_12px_40px_rgba(23,43,77,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-xs font-bold text-[#338CF0]">
                      Lv.{selectedDrain.level}
                    </span>

                    <span className="text-xs text-[#7A8F9F]">
                      {STATUS_LABELS[selectedDrain.status]}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-bold tracking-tight text-[#203451]">
                    {selectedDrain.nickname ?? selectedDrain.name}
                  </h2>

                  <p className="mt-1 text-xs text-[#8294A5]">
                    {selectedDrain.address}
                  </p>

                  <p className="mt-2 text-xs text-[#607B90]">
                    {selectedDrain.xp} XP · 빗물받이 #{selectedDrain.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="정보 카드 닫기"
                  className="px-2 text-xl text-[#93A2AF]"
                >
                  ×
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(`/drains/${selectedDrain.id}`)
                }
                className="mt-4 w-full rounded-2xl bg-[#3981F7] py-3 text-sm font-bold text-white transition hover:bg-[#2871E8] active:scale-[0.99]"
              >
                빗물받이 상세 보기
              </button>
            </div>
          )}

          {/* 지도 위 아이콘 전용 현재 위치 버튼 */}
            <button
              type="button"
              onClick={moveToMyLocation}
              disabled={locating}
              aria-label={locating ? '현재 위치 확인 중' : '현재 위치로 이동'}
              title="내 위치"
              aria-busy={locating}
              className="absolute bottom-[146px] right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#E8EDF5] bg-white text-[#3981F7] shadow-[0_4px_16px_rgba(23,43,77,0.10)] transition hover:bg-[#F8FAFD] active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={`h-5 w-5 ${locating ? 'animate-pulse' : ''}`}>
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            </button>

          {/* 지도와 분리하여 축척·Kakao 로고를 가리지 않는 하단 컨트롤 */}
          <section
            aria-label="지도 상태 필터 및 제보"
            className="absolute inset-x-0 bottom-0 z-10 h-[114px] border-t border-[#E8EDF5] bg-white px-3 py-3"
          >
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="빗물받이 상태">
              {FILTERS.map((option) => {
                const active = filter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(option.value)
                      setSelectedId(null)
                    }}
                    className={`flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1 text-[10px] font-bold transition duration-150 min-[400px]:text-[11px] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3981F7] ${
                      active
                        ? `${FILTER_ACTIVE_STYLES[option.value]} shadow-[0_3px_8px_rgba(23,43,77,0.10)]`
                        : 'border-[#E8EDF5] bg-white text-[#53647E] hover:bg-[#F8FAFD]'
                    }`}
                  >
                    {option.value !== 'all' && (
                      <span aria-hidden="true" className={`hidden h-1.5 w-1.5 shrink-0 rounded-full min-[360px]:block ${active ? 'bg-white' : FILTER_DOTS[option.value]}`} />
                    )}
                    {option.label}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#3981F7] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(57,129,247,0.30)] transition hover:bg-[#2871E8] active:scale-[0.99]"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                <path d="M10 4v12M4 10h12" />
              </svg>
              제보하기
            </button>

          </section>

          {/* 빗물받이 목록 */}
          {listOpen && (
            <DrainListPanel
              drains={filteredDrains}
              onSelect={handleSelectDrain}
              onClose={() => setListOpen(false)}
            />
          )}

          {/* 제보 작성 시연 */}
          {reportOpen && (
            <ReportDraftModal
              drains={MOCK_MAP_DRAINS}
              initialDrainId={selectedId}
              onClose={() => setReportOpen(false)}
              onComplete={handleReportComplete}
            />
          )}
        </>
      )}
    </main>
  )
}

export default function MapPage() {
  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY?.trim()

  if (!appKey) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="font-bold text-[#284B66]">
          카카오맵 JavaScript 키가 필요해요.
        </p>
        <p className="mt-2 text-sm text-[#8294A5]">
          .env.local에 VITE_KAKAO_MAP_KEY를 등록하고
          개발 서버를 다시 실행해 주세요.
        </p>
      </div>
    )
  }

  return <KakaoMapContent appKey={appKey} />
}
