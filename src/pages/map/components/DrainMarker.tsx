
import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import type {
  PositionedDrainMapItem,
} from '../../../types/map'

interface DrainMarkerProps {
  drain: PositionedDrainMapItem
  selected: boolean
  onSelect: (
    drain: PositionedDrainMapItem,
  ) => void
}

const levelFiles = import.meta.glob(
  '../../../assets/characters/level/*.svg',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>

const levelImages = new Map<number, string>()

for (const [path, url] of Object.entries(levelFiles)) {
  const match = path.match(
    /(?:level|lv)?[_-]?0*(\d+)\.svg$/i,
  )

  if (match) {
    levelImages.set(Number(match[1]), url)
  }
}

const MARKER_STYLES = {
  unadopted: 'bg-[#91B6A4]',
  normal: 'bg-[#4FBAA1]',
  overdue: 'bg-[#F5B84B]',
  blocked: 'bg-[#EF7272]',
  risk: 'bg-[#F5B84B]',
  unknown: 'bg-[#98A2B3]',
}

const FALLBACK_ICONS = {
  unadopted: '○',
  normal: '🌱',
  overdue: '!',
  blocked: '!',
  risk: '!',
  unknown: '?',
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
  onSelect,
}: DrainMarkerProps) {
  const image =
    drain.level !== null
      ? levelImages.get(drain.level)
      : undefined

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
        onClick={() => onSelect(drain)}
        
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
          {image ? (
            <img
              src={image}
              alt=""
              className="h-9 w-9 object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-xl font-bold text-white">
              {FALLBACK_ICONS[drain.status]}
            </span>
          )}
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
