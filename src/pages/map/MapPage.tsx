import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import {
  CustomOverlayMap,
  Map,
  useKakaoLoader,
} from 'react-kakao-maps-sdk'

import {
  getDrainDetail,
  getMapDrains,
  getDrainPage,
  mergeDrainDetail,
  type DrainSearchItem,
} from '../../apis/drains'
import { hasCoordinates, needsInspection } from '../../types/map'
import type {
  DrainMapFilter,
  DrainMapItem,
  MapBoundsParams,
} from '../../types/map'

import DrainMarker from './components/DrainMarker'
import DrainListPanel from './components/DrainListPanel'
import ReportDraftModal from './components/ReportDraftModal'
import CreateDrainModal from './components/CreateDrainModal'
import RainNoticeBanner from './components/RainNoticeBanner'
import { isStaffRole, useMyRole } from '../../features/admin/useMyRole'

const DEFAULT_CENTER = {
  lat: 37.4884,
  lng: 126.8042,
}

const DEFAULT_LEVEL = 4
const EMPTY_DRAINS: DrainMapItem[] = []

const FILTERS: {
  value: DrainMapFilter
  label: string
}[] = [
  { value: 'all', label: '전체' },
  { value: 'unadopted', label: '미입양' },
  { value: 'normal', label: '정상' },
  { value: 'inspection-needed', label: '점검 필요' },
  { value: 'blocked', label: '막힘 제보' },
]

const FILTER_DOTS: Record<DrainMapFilter, string> = {
  all: 'bg-[#6FAEFF]',
  unadopted: 'bg-[#98A2B3]',
  normal: 'bg-[#22A45D]',
  'inspection-needed': 'bg-[#F5B400]',
  blocked: 'bg-[#E5484D]',
}

const FILTER_ACTIVE_STYLES: Record<
  DrainMapFilter,
  string
> = {
  all: 'border-[#6FAEFF] bg-[#6FAEFF] text-white',
  unadopted:
    'border-[#B4BDC8] bg-[#B4BDC8] text-white',
  normal:
    'border-[#22A45D] bg-[#22A45D] text-white',
  'inspection-needed':
    'border-[#F5B400] bg-[#F5B400] text-[#3D2C00]',
  blocked:
    'border-[#E5484D] bg-[#E5484D] text-white',
}

const STATUS_LABELS = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
  risk: '주의',
  unknown: '상태 미확인',
}


// /list API의 status 파라미터는 지도 표시 상태 enum을 사용합니다.
const SEARCH_STATUSES: Partial<Record<DrainMapFilter, string>> = {
  unadopted: 'AVAILABLE',
  normal: 'NORMAL',
  blocked: 'BLOCKAGE_REPORTED',
}

const SEARCH_PAGE_SIZE = 10

interface Position {
  lat: number
  lng: number
}

function readMapBounds(
  map: kakao.maps.Map,
): MapBoundsParams {
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
  a: MapBoundsParams,
  b: MapBoundsParams,
) {
  const tolerance = 0.0000001

  return (
    Math.abs(a.minLatitude - b.minLatitude) <
      tolerance &&
    Math.abs(a.maxLatitude - b.maxLatitude) <
      tolerance &&
    Math.abs(a.minLongitude - b.minLongitude) <
      tolerance &&
    Math.abs(a.maxLongitude - b.maxLongitude) <
      tolerance
  )
}

function getErrorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : '서버 요청에 실패했어요.'
}

function KakaoMapContent({
  appKey,
}: {
  appKey: string
}) {
  const navigate = useNavigate()

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ['services'],
  })

  const mapRef = useRef<kakao.maps.Map | null>(null)
  const [zoomLevel,setZoomLevel] = useState(DEFAULT_LEVEL)
  const [nearby,setNearby] = useState<number[]>([])
  const hintTimeout = useRef<number | undefined>(undefined)
  useEffect(()=>()=>clearTimeout(hintTimeout.current),[])
  const searchAreaRef = useRef<HTMLElement | null>(null)

  const [bounds, setBounds] =
    useState<MapBoundsParams | null>(null)

  const [requestBounds, setRequestBounds] =
    useState<MapBoundsParams | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchPage, setSearchPage] = useState(0)
  const [searchSelectionId, setSearchSelectionId] = useState<number | null>(null)
  const [filter, setFilter] =
    useState<DrainMapFilter>('all')

  const [selectedSummary, setSelectedSummary] =
    useState<DrainMapItem | null>(null)

  const [listOpen, setListOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // 운영자는 지도 가운데 지점을 등록 위치로 고를 수 있습니다. (현장에 가지 않고 미리 등록할 때)
  const staff = isStaffRole(useMyRole().role)
  const [createCenter, setCreateCenter] = useState<{ latitude: number; longitude: number } | null>(null)

  const [currentPosition, setCurrentPosition] =
    useState<Position | null>(null)

  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')

  // 검색 영역 밖을 누르면 결과 목록만 닫습니다. 검색어는 유지합니다.
  useEffect(() => {
    if (!searchOpen) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        !searchAreaRef.current?.contains(target)
      ) {
        setSearchOpen(false)
      }
    }

    // 지도 SDK 등의 이벤트 처리보다 먼저 감지합니다. 모바일 터치도 지원합니다.
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
    }
  }, [searchOpen])

  // 지도 이동 완료 후 350ms 대기
  useEffect(() => {
    if (!bounds) return

    const timer = window.setTimeout(() => {
      setRequestBounds(bounds)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [bounds])

  // 지도 목록 API
  const {
    data: drains = EMPTY_DRAINS,
    isPending: drainsPending,
    isError: drainsError,
    error: drainsQueryError,
    refetch: refetchDrains,
  } = useQuery({
    queryKey: ['map-drains', requestBounds],
    queryFn: ({ signal }) =>
      getMapDrains(requestBounds!, signal),
    enabled: requestBounds !== null,
    staleTime: 30_000,
    retry: 1,
  })

  // 입력 중 불필요한 요청 방지를 위한 검색어 디바운스
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [query])

  // 이름·주소 검색은 전체 빗물받이 목록 API를 사용합니다.
  const searchStatus = SEARCH_STATUSES[filter]
  const {
    data: searchResults,
    isPending: searchPending,
    isError: searchError,
    error: searchQueryError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['drain-search', debouncedQuery, searchStatus, searchPage],
    queryFn: ({ signal }) => getDrainPage({
      q: debouncedQuery,
      page: searchPage,
      size: SEARCH_PAGE_SIZE,
      status: searchStatus,
    }, signal),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000,
    retry: 1,
  })

  // 선택한 빗물받이 상세 API
  const selectedId = selectedSummary?.id ?? null

  const {
    data: selectedDetail,
    isPending: detailPending,
    isError: detailError,
    error: detailQueryError,
  } = useQuery({
    queryKey: ['drain-detail', selectedId],
    queryFn: ({ signal }) =>
      getDrainDetail(selectedId!, signal),
    enabled: selectedId !== null,
    staleTime: 60_000,
    retry: 1,
  })

  // 목록 데이터와 상세 데이터 합치기
  const selectedDrain = useMemo(() => {
    if (!selectedSummary) return null

    if (
      !selectedDetail ||
      selectedDetail.id !== selectedSummary.id
    ) {
      return selectedSummary
    }

    return mergeDrainDetail(
      selectedSummary,
      selectedDetail,
    )
  }, [selectedSummary, selectedDetail])
  const selectedRainRequest = selectedDrain?.rainRequest

  // 서버 주소가 없을 때만 선택한 빗물받이의 좌표를 주소로 변환합니다.
  // 카카오맵 services 라이브러리의 역지오코딩을 사용합니다.
  const serverAddress = selectedDrain?.address?.trim() ?? ''
  const hasServerAddress = Boolean(
    serverAddress && serverAddress !== '주소 정보 없음',
  )
  const selectedLatitude =
    selectedDrain && hasCoordinates(selectedDrain)
      ? selectedDrain.latitude
      : null
  const selectedLongitude =
    selectedDrain && hasCoordinates(selectedDrain)
      ? selectedDrain.longitude
      : null
  const shouldLookupAddress =
    !loading &&
    !error &&
    selectedId !== null &&
    !hasServerAddress &&
    selectedLatitude !== null &&
    selectedLongitude !== null

  const {
    data: addressFromCoordinates,
    isFetching: addressFetching,
  } = useQuery<string | null>({
    queryKey: [
      'drain-coordinate-address',
      selectedId,
      selectedLatitude,
      selectedLongitude,
    ],
    enabled: shouldLookupAddress,
    staleTime: 60 * 60 * 1000,
    retry: 0,
    queryFn: () => {
      if (selectedLatitude === null || selectedLongitude === null) {
        return Promise.resolve(null)
      }

      return new Promise<string | null>((resolve) => {
        const geocoder = new kakao.maps.services.Geocoder()

        // 카카오맵 좌표 → 주소 순서는 경도(x), 위도(y)입니다.
        geocoder.coord2Address(
          selectedLongitude,
          selectedLatitude,
          (results, status) => {
            if (status !== kakao.maps.services.Status.OK || !results[0]) {
              resolve(null)
              return
            }

            const location = results[0]
            // 도로명 주소가 없는 위치는 지번 주소로 표시합니다.
            resolve(
              location.road_address?.address_name ||
                location.address?.address_name ||
                null,
            )
          },
        )
      })
    },
  })

  const addressLabel = hasServerAddress
    ? serverAddress
    : addressFromCoordinates ||
      (addressFetching
        ? '주소 확인 중...'
        : selectedLatitude !== null && selectedLongitude !== null
          ? `위도 ${selectedLatitude.toFixed(5)} · 경도 ${selectedLongitude.toFixed(5)}`
          : '주소 정보 없음')

  // 지도 영역 업데이트
  const updateBounds = useCallback(
    (map: kakao.maps.Map) => {
      const next = readMapBounds(map)

      setBounds((prev) =>
        prev && hasSameBounds(prev, next)
          ? prev
          : next,
      )
    },
    [],
  )

  const handleMapCreate = useCallback(
    (map: kakao.maps.Map) => {
      mapRef.current = map
      updateBounds(map)
    },
    [updateBounds],
  )

  // /list 응답은 좌표가 없으므로 상세 조회 후 지도 위치로 이동
  useEffect(() => {
    if (!selectedSummary || hasCoordinates(selectedSummary)) return
    if (!selectedDrain || !hasCoordinates(selectedDrain)) return

    const position = new kakao.maps.LatLng(
      selectedDrain.latitude,
      selectedDrain.longitude,
    )

    if (searchSelectionId === selectedSummary.id) {
      mapRef.current?.setCenter(position)
      mapRef.current?.setLevel(3)
    } else {
      mapRef.current?.panTo(position)
    }
  }, [selectedSummary, selectedDrain, searchSelectionId])

  // 지도 마커·목록은 기존 지도 영역 API만 사용
  const filteredDrains = useMemo(() => {
    if (filter === 'all') return drains
    if (filter === 'inspection-needed') return drains.filter(needsInspection)
    return drains.filter((drain) => drain.status === filter)
  }, [drains, filter])

  // 좌표가 있는 빗물받이만 마커 표시
  const visibleDrains = useMemo(() => {
    if (!bounds) return []

    return filteredDrains
      .filter(hasCoordinates)
      .filter(
        (drain) =>
          drain.latitude >= bounds.minLatitude &&
          drain.latitude <= bounds.maxLatitude &&
          drain.longitude >= bounds.minLongitude &&
          drain.longitude <= bounds.maxLongitude,
      )
  }, [filteredDrains, bounds])

  function hintNear(map:kakao.maps.Map, position:kakao.maps.LatLng) {
    const projection=map.getProjection()
    const center=projection.containerPointFromCoords(position)
    setNearby(visibleDrains.filter(drain=>{
      const point=projection.containerPointFromCoords(new kakao.maps.LatLng(drain.latitude,drain.longitude))
      return Math.hypot(point.x-center.x,point.y-center.y)<=58
    }).map(drain=>drain.id))
    clearTimeout(hintTimeout.current)
    hintTimeout.current=window.setTimeout(()=>setNearby([]),2000)
  }

  // 상세 조회 후 좌표가 확인된 선택 마커
  const selectedOverlay =
    selectedDrain &&
    hasCoordinates(selectedDrain) &&
    (filter !== 'inspection-needed' || needsInspection(selectedDrain)) &&
    !visibleDrains.some(
      (drain) => drain.id === selectedDrain.id,
    )
      ? selectedDrain
      : null

  // 지도 마커 또는 현재 지도 내 목록 선택
  const handleSelectDrain = (drain: DrainMapItem) => {
    setSearchOpen(false)
    setSearchSelectionId(null)
    setSelectedSummary(drain)
    setListOpen(false)
    setNotice('')

    if (hasCoordinates(drain)) {
      mapRef.current?.panTo(
        new kakao.maps.LatLng(drain.latitude, drain.longitude),
      )
    }
  }

  // /list 검색 결과 선택: 현재 지도에 없는 빗물받이도 상세 API로 찾음
  const handleSelectSearchResult = (item: DrainSearchItem) => {
    const existing = drains.find((drain) => drain.id === item.id)
    if (filter === 'inspection-needed' && (!existing || !needsInspection(existing))) {
      setFilter('all')
    }
    if (existing) {
      handleSelectDrain(existing)
      return
    }

    const summary: DrainMapItem = {
      id: item.id,
      name: item.name,
      address: item.address,
      nickname: item.nickname,
      latitude: null,
      longitude: null,
      adoptionStatus: null,
      isRisk: null,
      status: 'unknown',
      rainRequest: null,
      displayStatus: null,
      displayStatusLabel: null,
      dirtLevel: null,
      levelTitle: null,
      level: null,
      score: null,
    }

    setSelectedSummary(summary)
    setSearchSelectionId(item.id)
    setSearchOpen(false)
    setListOpen(false)
    setNotice('')
  }

  const openHelpRequest = (requestId: number) => {
    navigate(`/notifications?requestId=${requestId}`, {
      state: {
        mapRequestCoordinates: currentPosition && {
          latitude: currentPosition.lat,
          longitude: currentPosition.lng,
        },
      },
    })
  }

  // 내 위치 이동
  const moveToMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice(
        '위치 정보를 지원하지 않는 브라우저예요.',
      )
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

        mapRef.current?.setCenter(
          new kakao.maps.LatLng(
            position.lat,
            position.lng,
          ),
        )

        mapRef.current?.setLevel(3)

        setSelectedSummary(null)
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

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = query.trim()
    if (!keyword) {
      setSearchOpen(false)
      return
    }
    setSearchPage(0)
    setDebouncedQuery(keyword)
    setSearchOpen(true)
    setListOpen(false)
  }

  
const handleReportComplete = (reportId: number) => {
  setReportOpen(false)
  setNotice(
    `제보 #${reportId}가 접수됐어요. 관리자 검토 후 처리됩니다.`,
  )
}


  const missingCoordinates = drains.some(
    (drain) => !hasCoordinates(drain),
  )


const fetchingDrains =
  requestBounds !== null && drainsPending

const statusNotice = drainsError
  ? getErrorText(drainsQueryError)
  : fetchingDrains
    ? '빗물받이 목록을 불러오는 중이에요.'
    : missingCoordinates
      ? '일부 빗물받이는 좌표가 없어 마커를 표시할 수 없어요. 목록에서 선택해 주세요.'
      : ''


  return (
    <main
      className="relative w-full overflow-hidden bg-[#F3F6FA]"
      style={{
        height:
          'calc(100dvh - 128px - env(safe-area-inset-bottom))',
        minHeight: 420,
      }}
    >
      {/* 지도 */}
      <div className="absolute inset-x-0 bottom-[114px] top-0">
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
            className="dd-kakao-map h-full w-full"
            onCreate={handleMapCreate}
            onIdle={updateBounds}
            onZoomChanged={map=>setZoomLevel(map.getLevel())}
            onClick={(map,event)=>hintNear(map,event.latLng)}
          >
            {visibleDrains.map((drain) => (
              <DrainMarker
                key={drain.id}
                drain={drain}
                filter={filter}
                hint={zoomLevel<=3 || nearby.includes(drain.id)}
                selected={selectedId === drain.id}
                onSelect={drain=>{
                  if(mapRef.current && hasCoordinates(drain)) hintNear(mapRef.current,new kakao.maps.LatLng(drain.latitude,drain.longitude))
                  handleSelectDrain(drain)
                }}
              />
            ))}

            {selectedOverlay && (
              <DrainMarker
                drain={selectedOverlay}
                filter={filter}
                selected
                onSelect={handleSelectDrain}
              />
            )}

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
                  className="dd-map-overlay block h-4 w-4 rounded-full border-[3px] border-white bg-[#338CF0] shadow-[0_0_0_7px_rgba(51,140,240,0.18)]"
                />
              </CustomOverlayMap>
            )}
          </Map>
        )}
      </div>

      {!loading && !error && (
        <>
          {/* 검색창 */}
          <section
            aria-label="지도 검색"
            ref={searchAreaRef}
            className="absolute inset-x-3 top-3 z-30"
          >
            <form
              onSubmit={handleSearch}
              className="flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl border border-[#E8EDF5] bg-white pl-3 pr-2 shadow-[0_4px_16px_rgba(23,43,77,0.12)] transition focus-within:border-[#8DB8FF] focus-within:ring-2 focus-within:ring-[#EAF2FF]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-[18px] w-[18px] shrink-0 text-[#8795AA]"
              >
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="6.5"
                />
                <path d="m16 16 4 4" />
              </svg>

              <input
                type="search"
                value={query}
                onFocus={() => {
                  if (query.trim()) setSearchOpen(true)
                }}
                onClick={() => {
                  if (query.trim()) setSearchOpen(true)
                }}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearchPage(0)
                  setSearchOpen(Boolean(event.target.value.trim()))
                  setListOpen(false)
                }}
                placeholder="역곡동 · 빗물받이 검색"
                aria-label="위치 또는 빗물받이 검색"
                className="w-full min-w-0 flex-1 bg-transparent text-xs font-medium text-[#203451] outline-none placeholder:text-[#94A1B5]"
              />

              <button
                type="submit"
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-[#3981F7] transition hover:bg-[#EAF2FF]"
              >
                검색
              </button>
            </form>

            {/* 전체 빗물받이 검색 결과: GET /api/v1/drain/list */}
            {searchOpen && query.trim() && (
              <div
                aria-label="빗물받이 검색 결과"
                className="mt-2 max-h-[min(52dvh,380px)] overflow-y-auto rounded-2xl border border-[#E8EDF5] bg-white shadow-[0_12px_32px_rgba(23,43,77,0.18)]"
              >
                {query.trim() !== debouncedQuery || searchPending ? (
                  <p role="status" className="px-4 py-4 text-xs text-[#8294A5]">
                    검색 결과를 불러오는 중이에요.
                  </p>
                ) : searchError ? (
                  <div className="flex items-center justify-between gap-2 px-4 py-4 text-xs text-[#B84D4D]">
                    <span>{getErrorText(searchQueryError)}</span>
                    <button
                      type="button"
                      className="shrink-0 font-bold text-[#3981F7]"
                      onClick={() => void refetchSearch()}
                    >
                      재시도
                    </button>
                  </div>
                ) : searchResults && searchResults.content.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-[#8294A5]">
                    검색된 빗물받이가 없어요.
                  </p>
                ) : searchResults ? (
                  <>
                    <div className="border-b border-[#EDF1F5] px-4 py-2 text-[11px] text-[#8294A5]">
                      전체 {searchResults.totalElements}개 검색 결과
                    </div>
                    <div className="divide-y divide-[#F0F3F8]">
                      {searchResults.content.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="block w-full px-4 py-3 text-left transition hover:bg-[#F5F8FF]"
                        >
                          <span className="block truncate text-sm font-semibold text-[#203451]">
                            {item.nickname || item.name}
                          </span>
                          <span className="mt-1 block truncate text-[11px] text-[#8294A5]">
                            {item.address ? `${item.address} · ` : ''}빗물받이 #{item.id}
                          </span>
                        </button>
                      ))}
                    </div>
                    {searchResults.totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-[#EDF1F5] px-4 py-2">
                        <button
                          type="button"
                          disabled={searchPage === 0}
                          onClick={() => setSearchPage((page) => Math.max(0, page - 1))}
                          className="text-xs font-semibold text-[#3981F7] disabled:opacity-30"
                        >
                          이전
                        </button>
                        <span className="text-[11px] text-[#8294A5]">
                          {searchResults.page + 1} / {searchResults.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={!searchResults.hasNext}
                          onClick={() => setSearchPage((page) => page + 1)}
                          className="text-xs font-semibold text-[#3981F7] disabled:opacity-30"
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </section>

          {/* 목록 버튼 */}
          {/* 운영자에게만 보이는 지도 가운데 표시. 이 지점으로 빗물받이를 등록할 수 있습니다. */}
          {staff && (
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[calc((100%-114px)/2)] z-[5] -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="block text-[26px] font-light leading-none text-[#DC2626]">+</span>
              <span className="mt-0.5 block rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#DC2626]">등록 지점</span>
            </div>
          )}

          {/* 비 예보 배너: GET /api/v1/rain-notice */}
          <RainNoticeBanner />

          <button
            type="button"
            onClick={() => {
              setSearchOpen(false)
              setListOpen(true)
            }}
            aria-expanded={listOpen}
            className="absolute right-3 top-[72px] z-10 flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-[#E8EDF5] bg-white px-3 text-xs font-bold text-[#203451] shadow-[0_4px_14px_rgba(23,43,77,0.12)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M4 5h12M4 10h12M4 15h12" />
            </svg>
            <span>
              {filteredDrains.length}개 목록
            </span>
          </button>

          {/* API 로딩 및 오류 안내 */}
          {statusNotice && (
            <div
              role={drainsError ? 'alert' : 'status'}
              className="absolute left-3 right-3 top-[124px] z-20 flex items-center justify-between gap-2 rounded-xl border border-[#E8EDF5] bg-white px-3 py-2 text-xs text-[#53647E] shadow-md"
            >
              <span>{statusNotice}</span>

              {drainsError && (
                <button
                  type="button"
                  onClick={() => void refetchDrains()}
                  className="shrink-0 font-bold text-[#3981F7]"
                >
                  재시도
                </button>
              )}
            </div>
          )}

          {/* 일반 안내 */}
          {notice && (
            <div
              role="status"
              className={`absolute left-3 right-3 ${
                statusNotice
                  ? 'top-[185px]'
                  : 'top-[124px]'
              } z-20 flex items-center justify-between gap-2 rounded-2xl border border-[#E8EDF5] bg-white px-4 py-3 text-xs leading-relaxed text-[#53647E] shadow-md`}
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

          {/* 선택된 빗물받이 카드 */}
          {selectedDrain && (
            <div className="absolute bottom-[202px] left-3 right-3 z-20 max-h-[calc(100%-286px)] overflow-y-auto rounded-[24px] border border-[#E8EDF5] bg-white p-4 shadow-[0_12px_40px_rgba(23,43,77,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {selectedDrain.level !== null && (
                      <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-xs font-bold text-[#338CF0]">
                        Lv.{selectedDrain.level}
                      </span>
                    )}

                    <span className="text-xs text-[#7A8F9F]">
                      {selectedDrain.displayStatusLabel ??
                        STATUS_LABELS[selectedDrain.status]}
                    </span>
                    {selectedRainRequest?.status === 'NEEDS_HELP' && (
                      <span className="rounded-full bg-[#FFEDC4] px-2 py-1 text-xs font-bold text-[#80490B]">
                        도움 필요
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-base font-bold tracking-tight text-[#203451]">
                    {selectedDrain.nickname ??
                      selectedDrain.name}
                  </h2>

                  <p className="mt-1 text-xs text-[#8294A5]">
                    {addressLabel}
                  </p>

                  <p className="mt-2 text-xs text-[#607B90]">
                    {selectedDrain.score !== null &&
                      `XP ${selectedDrain.score}  `}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedSummary(null)
                  }
                  aria-label="정보 카드 닫기"
                  className="px-2 text-xl text-[#93A2AF]"
                >
                  ×
                </button>
              </div>

              {detailPending && (
                <p className="mt-3 text-xs text-[#8294A5]">
                  상세 정보를 불러오는 중이에요.
                </p>
              )}

              {detailError && (
                <p
                  role="alert"
                  className="mt-3 text-xs text-red-500"
                >
                  {getErrorText(detailQueryError)}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                {selectedRainRequest?.status === 'NEEDS_HELP' && (
                  <button
                    type="button"
                    onClick={() => openHelpRequest(selectedRainRequest.requestId)}
                    className="col-span-2 min-h-11 rounded-2xl bg-[#6384EF] px-2 py-3 text-xs font-bold text-white transition hover:bg-[#5476E3]"
                  >
                    도움 요청 보기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="min-h-11 rounded-2xl border border-[#DCE4F5] bg-[#F5F7FF] px-2 py-3 text-xs font-bold text-[#586FC8] transition hover:bg-[#EAF0FF] active:scale-[0.99]"
                >
                  제보하기
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/drains/${selectedDrain.id}`)}
                  className="min-h-11 rounded-2xl bg-[#3981F7] px-2 py-3 text-xs font-bold text-white transition hover:bg-[#2871E8] active:scale-[0.99]"
                >
                  빗물받이 상세 보기
                </button>
              </div>
            </div>
          )}

          {/* 현재 위치 버튼 */}
          <button
            type="button"
            onClick={moveToMyLocation}
            disabled={locating}
            aria-label={
              locating
                ? '현재 위치 확인 중'
                : '현재 위치로 이동'
            }
            title="내 위치"
            aria-busy={locating}
            className="absolute bottom-[146px] right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-[#E8EDF5] bg-white text-[#3981F7] shadow-[0_4px_16px_rgba(23,43,77,0.10)] disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className={`h-5 w-5 ${
                locating
                  ? 'animate-pulse'
                  : ''
              }`}
            >
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </button>

          {/* 하단 필터 및 빗물받이 등록 */}
          <section
            aria-label="지도 상태 필터 및 빗물받이 등록"
            className="absolute inset-x-0 bottom-0 z-10 h-[114px] border-t border-[#E8EDF5] bg-white px-3 py-3"
          >
            <div
              className="grid grid-cols-5 gap-1.5"
              role="group"
              aria-label="빗물받이 상태"
            >
              {FILTERS.map((option) => {
                const active =
                  filter === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(option.value)
                      setSearchPage(0)
                      setSelectedSummary(null)
                    }}
                    className={`flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1 text-[11px] font-bold transition min-[360px]:text-[12px] ${
                      active
                        ? `${FILTER_ACTIVE_STYLES[option.value]} shadow-[0_3px_8px_rgba(23,43,77,0.10)]`
                        : 'border-[#E8EDF5] bg-white text-[#53647E] hover:bg-[#F8FAFD]'
                    }`}
                  >
                    {option.value !== 'all' && (
                      <span
                        aria-hidden="true"
                        className={`hidden h-1.5 w-1.5 shrink-0 rounded-full min-[360px]:block ${
                          active
                            ? 'bg-white'
                            : FILTER_DOTS[
                                option.value
                              ]
                        }`}
                      />
                    )}

                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  const center = staff ? mapRef.current?.getCenter() : null
                  setCreateCenter(center ? { latitude: center.getLat(), longitude: center.getLng() } : null)
                  setCreateOpen(true)
                }}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-transparent bg-[#6384EF] px-3 text-sm font-semibold text-white outline-none shadow-[0_3px_10px_rgba(99,132,239,0.18)] transition-colors hover:bg-[#5476E3] active:bg-[#4869D4] focus-visible:ring-2 focus-visible:ring-[#8FA5F5] focus-visible:ring-offset-2"
              >
                새로운 빗물받이
              </button>
            </div>
          </section>

          {/* 빗물받이 목록 */}
          {listOpen && (
            <DrainListPanel
              drains={filteredDrains}
              onSelect={handleSelectDrain}
              onClose={() =>
                setListOpen(false)
              }
            />
          )}

          {/* 실제 빗물받이 등록 */}
          {createOpen && (
            <CreateDrainModal
              mapCenter={createCenter}
              onClose={() => setCreateOpen(false)}
              onViewDetail={(drainId) => {
                setCreateOpen(false)
                navigate(`/drains/${drainId}`)
              }}
            />
          )}

          {/* 선택된 빗물받이 제보 모달 */}
          {reportOpen && (
            <ReportDraftModal
              drains={drains}
              initialDrainId={selectedId}
              onClose={() =>
                setReportOpen(false)
              }
              onComplete={handleReportComplete}
            />
          )}
        </>
      )}
    </main>
  )
}

export default function MapPage() {
  const appKey =
    import.meta.env.VITE_KAKAO_MAP_KEY?.trim()

  if (!appKey) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="font-bold text-[#284B66]">
          카카오맵 JavaScript 키가 필요해요.
        </p>
        <p className="mt-2 text-sm text-[#8294A5]">
          .env.local에 VITE_KAKAO_MAP_KEY를
          등록하고 개발 서버를 다시 실행해 주세요.
        </p>
      </div>
    )
  }

  return <KakaoMapContent appKey={appKey} />
}
