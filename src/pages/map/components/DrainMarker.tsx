import { useState, useEffect } from 'react'
import { REACTIONS } from '../../login/reactions'
import Character from '../../../components/common/Character'
import '../../login/LoginPage.css'
import waiting from '../../../assets/characters/unadopted.png'
import happy from '../../../assets/characters/states/happy.svg'
import { greet } from './greet'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { needsInspection, type DrainMapFilter, type PositionedDrainMapItem } from '../../../types/map'

interface DrainMarkerProps {
  drain: PositionedDrainMapItem
  filter: DrainMapFilter
  hint?: boolean
  selected: boolean
  onSelect: (drain: PositionedDrainMapItem) => void
}

// 지도 마커 색: 정상 초록 · 점검 필요 노랑 · 막힘 제보 빨강 · 미입양 회색 (필터 점 색과 같음)
const MARKER_COLORS = {
  normal: 'bg-[#22A45D]',
  inspection: 'bg-[#F5B400]',
  blocked: 'bg-[#E5484D]',
  unknown: 'bg-[#98A2B3]',
}

function markerColor(drain: PositionedDrainMapItem) {
  if (drain.status === 'blocked') return MARKER_COLORS.blocked
  if (needsInspection(drain)) return MARKER_COLORS.inspection
  if (drain.status === 'normal') return MARKER_COLORS.normal
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
  NEEDS_HELP: { label: '도움 필요', className: 'bg-[#FFEDC4] text-[#80490B]' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-[#E4EEFF] text-[#264DAD]' },
  DONE: { label: '완료', className: 'bg-[#DCF5E8] text-[#216747]' },
  overdue: { label: '점검 지연', className: 'bg-[#FFF2D3] text-[#805719]' },
}

function getInspectionBadge(drain: PositionedDrainMapItem, filter: DrainMapFilter) {
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
  onSelect,
}: DrainMarkerProps) {
  const inspectionBadge = getInspectionBadge(drain, filter)
  const available =
    drain.adoptionStatus === 'AVAILABLE' || drain.status === 'unadopted'
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reaction = REACTIONS[(Math.max(tick, 1) - 1) % REACTIONS.length]
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setPlaying(false), 1250)
    return () => clearTimeout(timer)
  }, [tick, playing])
  return (
    <CustomOverlayMap
      position={{
        lat: drain.latitude,
        lng: drain.longitude,
      }}
      clickable
      xAnchor={0.5}
      yAnchor={0.9}
      zIndex={selected ? 20 : inspectionBadge ? 3 : 2}
    >
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

        aria-label={`${drain.nickname ?? drain.name}, ${drain.displayStatusLabel ?? STATUS_NAMES[drain.status]}${inspectionBadge ? `, ${inspectionBadge.label}` : ''}`}

        aria-pressed={selected}
        className="relative flex cursor-pointer flex-col items-center"
      >
        {inspectionBadge && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-full border border-white px-1.5 py-0.5 text-[10px] font-bold leading-tight shadow-sm ${inspectionBadge.className}`}
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
            rounded-full border-[3px] border-white
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
      </button>
    </CustomOverlayMap>
  )
}
