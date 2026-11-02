import type {
  DrainMapItem,
  DrainMapStatus,
  MapBoundsParams,
} from '../types/map'

const SAMPLE_NAMES = [
  '성심교정 정문',
  '지봉로 상가 앞',
  '역곡역 2번 출구',
  '등굣길 모퉁이',
  '역곡 어린이공원',
  '원룸 골목 입구',
]

const ADOPTED_INFO: Record<
  number,
  { nickname: string; level: number; xp: number }
> = {
  4: { nickname: '등굣길 또랑', level: 3, xp: 150 },
  5: { nickname: '공원 새싹', level: 1, xp: 75 },
  6: { nickname: '골목 친구', level: 2, xp: 100 },
}

function getMockStatus(id: number): DrainMapStatus {
  if ([1, 2, 3, 7].includes(id)) return 'blocked'
  if (id === 5) return 'overdue'
  if ([4, 6].includes(id)) return 'normal'
  return 'unadopted'
}

export const MOCK_MAP_DRAINS: DrainMapItem[] = Array.from(
  { length: 50 },
  (_, index) => {
    const id = index + 1
    const adoption = ADOPTED_INFO[id]
    const status = getMockStatus(id)

    return {
      id,
      name: SAMPLE_NAMES[index] ?? `역곡동 골목 ${id}번`,
      address:
        id === 1
          ? '부천시 원미구 지봉로 43 인근'
          : id === 3
            ? '부천시 원미구 역곡동 · 역곡역 인근'
            : '부천시 원미구 역곡동 · 시범 골목',

      nickname: adoption?.nickname ?? null,

      latitude: 37.486 + (index % 10) * 0.00063,
      longitude: 126.803 + Math.floor(index / 10) * 0.00052,

      adoptionStatus: adoption ? 'ADOPTED' : 'AVAILABLE',
      isRisk: status === 'blocked',

      status,
      level: adoption?.level ?? 0,
      xp: adoption?.xp ?? 0,
    }
  },
)

export function getMockDrainsInBounds(
  drains: DrainMapItem[],
  bounds: MapBoundsParams,
): DrainMapItem[] {
  return drains.filter(
    (drain) =>
      drain.latitude >= bounds.minLatitude &&
      drain.latitude <= bounds.maxLatitude &&
      drain.longitude >= bounds.minLongitude &&
      drain.longitude <= bounds.maxLongitude,
  )
}