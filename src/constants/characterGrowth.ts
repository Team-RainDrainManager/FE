// 서버 레벨에 해당하는 대사입니다. 각 행의 대사는 한 번의 터치에서 순서대로 표시합니다.
const growthStages = [
  { from: 0, lines: ['아파..', '찝찝하다', '부끄러워'] },
  { from: 1, lines: ['어 또 왔네', '청소해주러 온거야?', '솔직히 다시 올 줄 몰랐어'] },
  { from: 5, lines: ['안녕 ㅎㅎ', '나랑 친구할래?', '너 마음에 들어'] },
  { from: 10, lines: ['이제 악취가 안 나', '상쾌하다', '나랑 친구하자!'] },
  { from: 15, lines: ['오늘 날씨 좋다 그치', '오는데 안 힘들었어?', '또 와줘서 고마워'] },
  { from: 20, lines: ['점심 뭐 먹었어?', '헉 벌써 저녁이라고?', '잘 먹고 다녀'] },
  { from: 25, lines: ['오늘은 조금 춥네', '따뜻하게 입고 다녀', '감기 조심해'] },
  { from: 30, lines: ['내 패션 어때?', '뭐? 안 귀엽다고? 거짓말', '너 패션이 좀 더 좋다고 인정해줄게'] },
  { from: 35, lines: ['왕이 넘어지면?', '킹콩! 으하하하', '야야 표정 좀 풀어라'] },
  { from: 40, lines: ['이제 낙엽이랑 담배꽁초가', '어떻게 생겼었는지 기억도 안 나', '고마워'] },
  { from: 45, lines: ['어 벌써', '우리가 만난지가', '이렇게나 됐네..ㅎㅎ'] },
  { from: 50, lines: ['축하해!', '최고 레벨까지 키웠어', '항상 고마워 너 덕분이야'] },
] as const

export function getCharacterGrowth(level: number) {
  for (let index = growthStages.length - 1; index > 0; index--) {
    if (level >= growthStages[index].from) return growthStages[index]
  }
  return growthStages[0]
}

// 입양 후에는 해금한 동작만 순서대로 재생합니다.
const adoptedDances = [
  { level: 1, motion: 'superjump' },
  { level: 3, motion: 'wiggle' },
  { level: 5, motion: 'dance' },
  { level: 7, motion: 'hover-dance' },
  { level: 10, motion: 'spin' },
] as const
export type GrowthDance = 'adoption-hop' | (typeof adoptedDances)[number]['motion']

export function getGrowthDance(level: number, index: number, unadopted: boolean): GrowthDance {
  if (unadopted) return 'adoption-hop'
  const unlocked = adoptedDances.filter((dance) => dance.level <= Math.max(1, level))
  return unlocked[index % unlocked.length].motion
}
