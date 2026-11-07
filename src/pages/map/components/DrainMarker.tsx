import Avatar from '../../shop/Avatar'
import { greet } from '../../shop/greet'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import type {
  PositionedDrainMapItem,
} from '../../../types/map'

interface DrainMarkerProps {
  drain: PositionedDrainMapItem
  outfit?: string | null
  selected: boolean
  onSelect: (
    drain: PositionedDrainMapItem,
  ) => void
}

const MARKER_STYLES = {
  unadopted: 'bg-[#91B6A4]',
  normal: 'bg-[#4FBAA1]',
  overdue: 'bg-[#F5B84B]',
  blocked: 'bg-[#EF7272]',
  risk: 'bg-[#F5B84B]',
  unknown: 'bg-[#98A2B3]',
}

const STATUS_NAMES = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
  risk: '주의',
  unknown: '상태 미확인',
}

export default function DrainMarker({
  drain,
  selected,
  outfit,
  onSelect,
}: DrainMarkerProps) {
  return (
    <CustomOverlayMap
      position={{
        lat: drain.latitude,
        lng: drain.longitude,
      }}
      clickable
      xAnchor={0.5}
      yAnchor={0.9}
      zIndex={selected ? 20 : 2}
    >
      <button
        type="button"
        onClick={event => { greet(event); onSelect(drain) }}
        
aria-label={`${
  drain.nickname ?? drain.name
}, ${
  drain.level !== null
    ? `레벨 ${drain.level}, `
    : ''
}${
  drain.displayStatusLabel ??
  STATUS_NAMES[drain.status]
}`}

        aria-pressed={selected}
        className="flex cursor-pointer flex-col items-center"
      >
        <span
          className={`
            flex h-12 w-12 items-center justify-center
            rounded-full border-[3px] border-white
            shadow-[0_3px_12px_rgba(0,0,0,0.22)]
            transition-transform
            ${MARKER_STYLES[drain.status]}
            ${
              selected
                ? 'scale-125 ring-4 ring-white/60'
                : ''
            }
          `}
        >
          <Avatar outfit={outfit} available={drain.adoptionStatus === 'AVAILABLE' || drain.status === 'unadopted'} />
        </span>

        {drain.level !== null && (
          <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#385A73] shadow-sm">
            Lv.{drain.level}
          </span>
        )}
      </button>
    </CustomOverlayMap>
  )
}
