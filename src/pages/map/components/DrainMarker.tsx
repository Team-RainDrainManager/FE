import { useState, useEffect } from 'react'
import { REACTIONS } from '../../login/reactions'
import Character from '../../../components/common/Character'
import '../../login/LoginPage.css'
import '../map-dark.css'
import waiting from '../../../assets/characters/unadopted.png'
import happy from '../../../assets/characters/states/happy.svg'
import { greet } from './greet'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { drainCategory, type DrainMapFilter, type PositionedDrainMapItem } from '../../../types/map'

interface DrainMarkerProps {
  drain: PositionedDrainMapItem
  filter: DrainMapFilter
  hint?: boolean
  // pin: 작은 캐릭터 + 꼬리(꼬리 끝이 정확한 위치) · dot: 다른 마커와 겹칠 때 상태 색 점
  variant?: 'pin' | 'dot'
  selected: boolean
  onSelect: (drain: PositionedDrainMapItem) => void
}

// 지도 마커 색: 정상 초록 · 점검 필요 노랑 · 막힘 제보 빨강 · 미입양 회색 (필터 점 색과 같음, 다크모드 색은 map-dark.css)
const MARKER_COLORS = {
  normal: 'dd-marker-normal',
  inspection: 'dd-marker-inspection',
  blocked: 'dd-marker-blocked',
  unknown: 'dd-marker-unknown',
}

function markerColor(drain: PositionedDrainMapItem) {
  const category = drainCategory(drain)
  if (category === 'blocked') return MARKER_COLORS.blocked
  if (category === 'inspection-needed') return MARKER_COLORS.inspection
  if (category === 'normal') return MARKER_COLORS.normal
  return MARKER_COLORS.unknown
}

const STATUS_NAMES = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
  risk: '주의',
  unknown: '상태 미확인',
}

const INSPECTION_BADGES = {
  // 노란(점검 필요) 마커 위 말풍선은 지도 필터 이름과 같게 '점검 필요'로
  NEEDS_HELP: { label: '점검 필요', className: 'bg-[#FFEDC4] text-[#80490B]' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-[#E4EEFF] text-[#264DAD]' },
  DONE: { label: '완료', className: 'bg-[#DCF5E8] text-[#216747]' },
  overdue: { label: '점검 필요', className: 'bg-[#FFF2D3] text-[#805719]' },
}

// 비 예보 대신 점검 표시는 입양된 빗물받이에만 띄웁니다.
// - 점검 필요: 입양자가 점검을 못 해 이웃의 대신 점검이 필요한 곳
// - 입양 안 된 빗물받이(서버가 비 예보 때 모두 대신 점검 대상으로 엶)와 막힘 제보(시민이 치울 수 없음)에는 띄우지 않음
function getInspectionBadge(drain: PositionedDrainMapItem, filter: DrainMapFilter) {
  const category = drainCategory(drain)
  if (category !== 'inspection-needed' && category !== 'normal') return null
  const rainStatus = drain.rainRequest?.status
  if (filter === 'all') return rainStatus ? INSPECTION_BADGES[rainStatus] : null
  if (filter !== 'inspection-needed') return null
  if (rainStatus === 'NEEDS_HELP') return INSPECTION_BADGES.NEEDS_HELP
  return drain.status === 'overdue' ? INSPECTION_BADGES.overdue : null
}

export default function DrainMarker({
  drain,
  filter,
  selected,
  hint = false,
  variant = 'pin',
  onSelect,
}: DrainMarkerProps) {
  const inspectionBadge = getInspectionBadge(drain, filter)
  // 막힘 제보가 있는 빗물받이는 입양할 수 없어 미입양 모양 대신 빨간 마커로 보입니다.
  const available = drainCategory(drain) === 'unadopted'
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reaction = REACTIONS[(Math.max(tick, 1) - 1) % REACTIONS.length]
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setPlaying(false), 1250)
    return () => clearTimeout(timer)
  }, [tick, playing])
  const dot = variant === 'dot' && !selected
  const label = `${drain.nickname ?? drain.name}, ${drain.displayStatusLabel ?? STATUS_NAMES[drain.status]}${inspectionBadge ? `, ${inspectionBadge.label}` : ''}`
  return (
    // 기준점은 항상 마커 아래 끝(핀은 꼬리 끝, 점은 CSS로 가운데를 맞춤). 점 ↔ 핀이 바뀌어도 같은 오버레이라 깜박이지 않습니다.
    <CustomOverlayMap
      position={{
        lat: drain.latitude,
        lng: drain.longitude,
      }}
      clickable
      xAnchor={0.5}
      yAnchor={1}
      zIndex={selected ? 20 : dot ? 1 : inspectionBadge ? 3 : 2}
    >
      {dot ? (
        <button
          type="button"
          onClick={() => onSelect(drain)}
          aria-label={label}
          className="dd-map-overlay drain-dot-hit cursor-pointer"
        >
          <span aria-hidden="true" className={`drain-dot dd-marker-ring ${available ? 'dd-marker-unknown' : markerColor(drain)}`} />
        </button>
      ) : (
      <button
        type="button"
        onClick={(event) => {
          if (selected && available) {
            setTick((t) => t + 1)
            setPlaying(true)
          } else {
            greet(event)
            onSelect(drain)
          }
        }}

        aria-label={label}

        aria-pressed={selected}
        className="dd-map-overlay drain-pin relative flex cursor-pointer flex-col items-center"
      >
        {inspectionBadge && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-full border dd-marker-ring px-1.5 py-0.5 text-[10px] font-bold leading-tight shadow-sm ${inspectionBadge.className}`}
          >
            {inspectionBadge.label}
          </span>
        )}
        {available && ((hint && !selected) || (selected && playing)) && (
          <span
            className="drain-whisper"
            style={inspectionBadge ? { bottom: 'calc(100% + 22px)' } : undefined}
          >
            {selected ? reaction.text : '저를 입양해 주세요!'}
          </span>
        )}
        <span
          className={`
            drain-disc flex items-center justify-center
            rounded-full border-[3px] dd-marker-ring
            shadow-[0_3px_12px_rgba(0,0,0,0.22)]
            transition-transform
            ${selected && available ? 'drain-focus' : hint && available ? 'drain-alert' : ''} ${available ? 'drain-available' : markerColor(drain)}
            ${selected && !available ? 'scale-125 ring-4 ring-white/60' : ''}
          `}
        >
          <span
            key={tick}
            className={
              selected && available
                ? 'drain-actor dd-login-character-action--' +
                  (playing ? reaction.motion : 'idle')
                : 'drain-actor'
            }
          >
            {selected && playing && available ? (
              <Character type="state" state={reaction.face} size={128} />
            ) : (
              <span className="dd-face" aria-hidden="true">
                <img src={available ? waiting : happy} alt="" draggable={false} />
              </span>
            )}
          </span>
        </span>
        <span aria-hidden="true" className="drain-tail" />
      </button>
      )}
    </CustomOverlayMap>
  )
}
