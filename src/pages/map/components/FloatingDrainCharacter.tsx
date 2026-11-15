import GrowthReactionButton from '../../../components/common/GrowthReactionButton'
import { drainCategory, type DrainMapItem } from '../../../types/map'
import '../map-dark.css'

export default function FloatingDrainCharacter({ drain }: {
  drain: DrainMapItem
}) {
  const unadopted = drainCategory(drain) === 'unadopted' || drain.adoptionStatus === 'AVAILABLE'
  const hasLevel = drain.level !== null && Number.isFinite(drain.level)
  const level = unadopted ? 0 : Math.max(1, drain.level ?? 1)

  return (
    <div className="dd-float pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2">
      <GrowthReactionButton
        key={`${drain.id}:${level}:${hasLevel || unadopted}`}
        level={level}
        name={drain.nickname ?? drain.name}
        size={180}
        variant="map"
        canReact={hasLevel || unadopted}
      />
    </div>
  )
}
