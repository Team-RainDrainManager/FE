
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
  mergeDrainDetail,
} from '../../apis/drains'
import { hasCoordinates } from '../../types/map'
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
const EMPTY_DRAINS: DrainMapItem[] = []

const FILTERS: {
  value: DrainMapFilter
  label: string
}[] = [
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

const FILTER_ACTIVE_STYLES: Record<
  DrainMapFilter,
  string
> = {
  all: 'border-[#6FAEFF] bg-[#6FAEFF] text-white',
  unadopted:
    'border-[#B4BDC8] bg-[#B4BDC8] text-white',
  normal:
    'border-[#62C19C] bg-[#62C19C] text-white',
  overdue:
    'border-[#F0C24F] bg-[#F0C24F] text-white',
  blocked:
    'border-[#E97C7C] bg-[#E97C7C] text-white',
}

const STATUS_LABELS = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
  risk: '주의',
  unknown: '상태 미확인',
}

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
  })

  const mapRef = useRef<kakao.maps.Map | null>(null)

  const [bounds, setBounds] =
    useState<MapBoundsParams | null>(null)

  const [requestBounds, setRequestBounds] =
    useState<MapBoundsParams | null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] =
    useState<DrainMapFilter>('all')

  const [selectedSummary, setSelectedSummary] =
    useState<DrainMapItem | null>(null)

  const [listOpen, setListOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const [currentPosition, setCurrentPosition] =
    useState<Position | null>(null)

  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState('')

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

  // 목록에 좌표가 없으면 상세 조회 후 이동
  useEffect(() => {
    if (!selectedSummary) return
    if (hasCoordinates(selectedSummary)) return
    if (!selectedDrain) return
    if (!hasCoordinates(selectedDrain)) return

    mapRef.current?.panTo(
      new kakao.maps.LatLng(
        selectedDrain.latitude,
        selectedDrain.longitude,
      ),
    )
  }, [selectedSummary, selectedDrain])

  // 검색 및 상태 필터
  const filteredDrains = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return drains.filter((drain) => {
      if (
        filter !== 'all' &&
        drain.status !== filter
      ) {
        return false
      }

      const searchable = [
        drain.name,
        drain.nickname ?? '',
        drain.address ?? '',
        String(drain.id),
      ]
        .join(' ')
        .toLowerCase()

      return (
        !keyword || searchable.includes(keyword)
      )
    })
  }, [drains, query, filter])

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

  // 상세 조회 후 좌표가 확인된 선택 마커
  const selectedOverlay =
    selectedDrain &&
    hasCoordinates(selectedDrain) &&
    !visibleDrains.some(
      (drain) => drain.id === selectedDrain.id,
    )
      ? selectedDrain
      : null

  // 마커 또는 목록 선택
  const handleSelectDrain = (
    drain: DrainMapItem,
  ) => {
    setSelectedSummary(drain)
    setListOpen(false)
    setNotice('')

    if (hasCoordinates(drain)) {
      mapRef.current?.panTo(
        new kakao.maps.LatLng(
          drain.latitude,
          drain.longitude,
        ),
      )
    }
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

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (filteredDrains.length === 0) {
      setNotice(
        '현재 지도 영역에서 검색 결과가 없어요.',
      )
      return
    }

    handleSelectDrain(filteredDrains[0])
  }

  // 제보는 현재 UI 시연 상태 유지
  const handleReportComplete = () => {
    setReportOpen(false)
    setNotice(
      '제보 입력을 확인했어요. 아직 서버에 제출되지는 않습니다.',
    )
  }

  const missingCoordinates = drains.some(
    (drain) => !hasCoordinates(drain),
  )

  const unavailableFilter =
    filter === 'overdue' || filter === 'blocked'

  const fetchingDrains =
    requestBounds !== null && drainsPending

  const statusNotice = drainsError
    ? getErrorText(drainsQueryError)
    : fetchingDrains
      ? '빗물받이 목록을 불러오는 중이에요.'
      : unavailableFilter
        ? '현재 API로는 점검 지연과 막힘 제보를 구분할 수 없어요.'
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
            className="h-full w-full"
            onCreate={handleMapCreate}
            onIdle={updateBounds}
            onClick={() => setSelectedSummary(null)}
          >
            {visibleDrains.map((drain) => (
              <DrainMarker
                key={drain.id}
                drain={drain}
                selected={selectedId === drain.id}
                onSelect={handleSelectDrain}
              />
            ))}

            {selectedOverlay && (
              <DrainMarker
                drain={selectedOverlay}
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
                  className="block h-4 w-4 rounded-full border-[3px] border-white bg-[#338CF0] shadow-[0_0_0_7px_rgba(51,140,240,0.18)]"
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
            className="absolute inset-x-3 top-3 z-10"
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
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelectedSummary(null)
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
          </section>

          {/* 목록 버튼 */}
          <button
            type="button"
            onClick={() => setListOpen(true)}
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
                      {STATUS_LABELS[
                        selectedDrain.status
                      ]}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-bold tracking-tight text-[#203451]">
                    {selectedDrain.nickname ??
                      selectedDrain.name}
                  </h2>

                  <p className="mt-1 text-xs text-[#8294A5]">
                    {selectedDrain.address ??
                      '주소 정보 없음'}
                  </p>

                  <p className="mt-2 text-xs text-[#607B90]">
                    {selectedDrain.score !== null &&
                      `점수 ${selectedDrain.score} · `}
                    빗물받이 #{selectedDrain.id}
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

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/drains/${selectedDrain.id}`,
                  )
                }
                className="mt-4 w-full rounded-2xl bg-[#3981F7] py-3 text-sm font-bold text-white transition hover:bg-[#2871E8] active:scale-[0.99]"
              >
                빗물받이 상세 보기
              </button>
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

          {/* 하단 필터 및 제보 */}
          <section
            aria-label="지도 상태 필터 및 제보"
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
                      setSelectedSummary(null)
                    }}
                    className={`flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-1 text-[10px] font-bold transition min-[400px]:text-[11px] ${
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

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#3981F7] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(57,129,247,0.30)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
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
              onClose={() =>
                setListOpen(false)
              }
            />
          )}

          {/* 제보 시연 모달 */}
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
