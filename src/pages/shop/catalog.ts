export const categories = ['모자', '소품', '메이크업', '염색', '동작'] as const
export type Category = (typeof categories)[number]
export const leagueNames = [
  '나무',
  '돌',
  '철',
  '청동',
  '은',
  '금',
  '백금',
  '다이아',
]
export const leagueLevel = (score: number) =>
  Math.min(7, Math.max(0, Math.floor(score / 150)))

const collections = [
  {
    key: 'petal',
    color: '#da648c',
    light: '#ffd1dc',
    dark: '#803b5f',
    names: [
      '튤립 보닛',
      '꽃편지 봉투',
      '벚꽃 블러셔',
      '딸기 우유',
      '꽃잎 인사',
    ],
  },
  {
    key: 'tide',
    color: '#449fb1',
    light: '#b5f2eb',
    dark: '#246377',
    names: [
      '진주 조개관',
      '산호 요술봉',
      '물빛 언더라인',
      '바다 유리',
      '파도타기',
    ],
  },
  {
    key: 'honey',
    color: '#d99639',
    light: '#ffe2a2',
    dark: '#885731',
    names: ['밀랍 왕관', '꿀단지', '살구 립글로스', '허니 버터', '꿀벌 비행'],
  },
  {
    key: 'berry',
    color: '#9a77d5',
    light: '#ebd3ff',
    dark: '#5e468a',
    names: [
      '자수정 마녀 모자',
      '별자리 마도서',
      '보랏빛 속눈썹',
      '블루베리 소르베',
      '마법사 회전',
    ],
  },
  {
    key: 'frost',
    color: '#5799d8',
    light: '#d4f4ff',
    dark: '#345b98',
    names: [
      '눈꽃 티아라',
      '수정 스노볼',
      '서리 펄 섀도',
      '빙하 사파이어',
      '피겨 스텝',
    ],
  },
  {
    key: 'dusk',
    color: '#cb7192',
    light: '#ffdfb8',
    dark: '#683e78',
    names: [
      '황혼의 월계관',
      '초승달 하프',
      '장밋빛 틴트',
      '노을 자개',
      '달빛 왈츠',
    ],
  },
]
export const DECORATIONS = collections.flatMap((collection, design) =>
  categories.map((category, slot) => ({
    id: collection.key + '-' + slot,
    title: collection.names[slot],
    category,
    slot,
    design,
    color: collection.color,
    light: collection.light,
    dark: collection.dark,
    level: [0, 0, 0, 1, 2, 3][design] + (slot === 4 && design >= 3 ? 1 : 0),
    price: 2 + design * 2 + [2, 1, 0, 1, 3][slot],
  })),
)
export type StudioItem = (typeof DECORATIONS)[number]
export function currentId(id: string) {
  const legacy = /^([heasfp])0([1-8])$/.exec(id)
  if (!legacy) return id
  const slot = { h: 0, e: 2, a: 1, s: 3, f: 4, p: 3 }[legacy[1]]!
  return (
    collections[(Number(legacy[2]) - 1) % collections.length].key + '-' + slot
  )
}
export function wornItems(outfit?: string | null) {
  return (outfit || '')
    .split(',')
    .map(currentId)
    .flatMap((id) => DECORATIONS.find((item) => item.id === id) ?? [])
}
export function tryOn(outfit: string | null, item: StudioItem) {
  return [
    ...wornItems(outfit).filter((other) => other.slot !== item.slot),
    item,
  ]
    .sort((a, b) => a.slot - b.slot)
    .map((i) => i.id)
    .join(',')
}
export function rankStyle(rank: number) {
  return categories
    .slice(0, 4)
    .map(
      (_, slot) =>
        collections[
          (rank + slot * (2 + Math.floor(rank / collections.length))) %
            collections.length
        ].key +
        '-' +
        slot,
    )
    .join(',')
}
