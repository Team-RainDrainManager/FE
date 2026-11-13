import { CustomOverlayMap } from 'react-kakao-maps-sdk'

import { drainCategory, type PositionedDrainMapItem } from '../../../types/map'
import '../map-dark.css'

export interface DrainClusterItem {
  key: string
  latitude: number
  longitude: number
  drains: PositionedDrainMapItem[]
}

interface DrainClusterProps {
  cluster: DrainClusterItem
  onOpen: (cluster: DrainClusterItem) => void
}

/**
 * 지도를 축소했을 때 가까운 빗물받이 여러 개를 묶어 보여 주는 원. 누르면 그 자리로 확대합니다.
 * 묶음 안에 막힘 제보나 점검 필요가 있으면 오른쪽 위 점으로 알려 줍니다 (빨강이 노랑보다 먼저).
 */
export default function DrainCluster({ cluster, onOpen }: DrainClusterProps) {
  const count = cluster.drains.length
  const categories = cluster.drains.map(drainCategory)
  const blocked = categories.filter((category) => category === 'blocked').length
  const inspection = categories.filter((category) => category === 'inspection-needed').length
  // 개수가 많을수록 조금씩 크게 (40 ~ 58px)
  const size = Math.min(58, 40 + Math.round(Math.log2(count) * 5))
  const alert = blocked > 0 ? 'blocked' : inspection > 0 ? 'inspection' : null
  const summary = [
    blocked > 0 ? `막힘 제보 ${blocked}개` : '',
    inspection > 0 ? `점검 필요 ${inspection}개` : '',
  ].filter(Boolean).join(', ')

  return (
    <CustomOverlayMap
      position={{ lat: cluster.latitude, lng: cluster.longitude }}
      clickable
      xAnchor={0.5}
      yAnchor={0.5}
      zIndex={4}
    >
      <button
        type="button"
        onClick={() => onOpen(cluster)}
        aria-label={`빗물받이 ${count}개${summary ? ` (${summary})` : ''}, 눌러서 확대`}
        className="dd-map-overlay dd-cluster relative grid cursor-pointer place-items-center rounded-full border-[3px] dd-marker-ring font-extrabold tabular-nums text-white"
        style={{ width: size, height: size, fontSize: count >= 100 ? 14 : 16 }}
      >
        {count >= 100 ? '99+' : count}
        {alert && (
          <span
            aria-hidden="true"
            className={`absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 dd-marker-ring ${
              alert === 'blocked' ? 'dd-marker-blocked' : 'dd-marker-inspection'
            }`}
          />
        )}
      </button>
    </CustomOverlayMap>
  )
}
