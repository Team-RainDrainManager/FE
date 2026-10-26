
const levelFiles = import.meta.glob<string>(
  '../assets/characters/levels/level-*.svg',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

const stateFiles = import.meta.glob<string>(
  '../assets/characters/states/*.svg',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

export const MIN_CHARACTER_LEVEL = 0
export const MAX_CHARACTER_LEVEL = 50

export type CharacterState =
  | 'crying'
  | 'happy'
  | 'joy'
  | 'proud'
  | 'sleepy'
  | 'smile'
  | 'sparkle'
  | 'star'
  | 'surprised'
  | 'wink'

const levelImages: Record<number, string> = {}
const stateImages: Record<string, string> = {}

for (const [path, url] of Object.entries(levelFiles)) {
  const match = path.match(/level-(\d+)\.svg$/)

  if (match) {
    const level = Number(match[1])
    levelImages[level] = url
  }
}

for (const [path, url] of Object.entries(stateFiles)) {
  const match = path.match(/([^/]+)\.svg$/)

  if (match) {
    const state = match[1]
    stateImages[state] = url
  }
}

export function getLevelCharacter(level: number): string {
  const safeLevel = Number.isFinite(level)
    ? Math.min(
        MAX_CHARACTER_LEVEL,
        Math.max(MIN_CHARACTER_LEVEL, Math.floor(level)),
      )
    : MIN_CHARACTER_LEVEL

  const image = levelImages[safeLevel]

  if (!image) {
    throw new Error(
      `레벨 ${safeLevel} 캐릭터 SVG 파일이 없습니다.`,
    )
  }

  return image
}

export function getStateCharacter(
  state: CharacterState,
): string {
  const image = stateImages[state]

  if (!image) {
    throw new Error(
      `${state} 상태 캐릭터 SVG 파일이 없습니다.`,
    )
  }

  return image
}
