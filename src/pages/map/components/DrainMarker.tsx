import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import type { DrainMapItem } from '../../../types/map'

interface DrainMarkerProps {
  drain: DrainMapItem
  selected: boolean
  onSelect: (drain: DrainMapItem) => void
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
  const match = path.match(/(?:level|lv)?[_-]?0*(\d+)\.svg$/i)

  if (match) {
    levelImages.set(Number(match[1]), url)
  }
}

const MARKER_STYLES = {
  unadopted: 'bg-[#91B6A4]',
  normal: 'bg-[#4FBAA1]',
  overdue: 'bg-[#F5B84B]',
  blocked: 'bg-[#EF7272]',
}

const FALLBACK_ICONS = {
  unadopted: '○',
  normal: '🌱',
  overdue: '!',
  blocked: '!',
}

const STATUS_NAMES = {
  unadopted: '미입양',
  normal: '정상',
  overdue: '점검 지연',
  blocked: '막힘 제보',
}

export default function DrainMarker({
  drain,
  selected,
  onSelect,
}: DrainMarkerProps) {
  const image = levelImages.get(drain.level)

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
        aria-label={`${drain.nickname ?? drain.name}, 레벨 ${drain.level}, ${STATUS_NAMES[drain.status]}`}
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
            ${selected ? 'scale-125 ring-4 ring-white/60' : ''}
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

        <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#385A73] shadow-sm">
          Lv.{drain.level}
        </span>
      </button>
    </CustomOverlayMap>
  )
}