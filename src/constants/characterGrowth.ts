// 서버 레벨에 해당하는 대사와 해금 개수입니다. 각 행의 대사는 한 번의 터치에서 순서대로 표시합니다.
const growthStages = [
  { from: 0, dances: 0, lines: ['아파..', '찝찝하다', '부끄러워'] },
  { from: 1, dances: 0, lines: ['어 또 왔네', '청소해주러 온거야?', '솔직히 다시 올 줄 몰랐어'] },
  { from: 5, dances: 0, lines: ['안녕 ㅎㅎ', '나랑 친구할래?', '너 마음에 들어'] },
  { from: 10, dances: 1, lines: ['이제 악취가 안 나', '상쾌하다', '나랑 친구하자!'] },
  { from: 15, dances: 2, lines: ['오늘 날씨 좋다 그치', '오는데 안 힘들었어?', '또 와줘서 고마워'] },
  { from: 20, dances: 3, lines: ['점심 뭐 먹었어?', '헉 벌써 저녁이라고?', '잘 먹고 다녀'] },
  { from: 25, dances: 4, lines: ['오늘은 조금 춥네', '따뜻하게 입고 다녀', '감기 조심해'] },
  { from: 30, dances: 5, lines: ['내 패션 어때?', '뭐? 안 귀엽다고? 거짓말', '너 패션이 좀 더 좋다고 인정해줄게'] },
  { from: 35, dances: 5, lines: ['왕이 넘어지면?', '킹콩! 으하하하', '야야 표정 좀 풀어라'] },
  { from: 40, dances: 5, lines: ['이제 낙엽이랑 담배꽁초가', '어떻게 생겼었는지 기억도 안 나', '고마워'] },
  { from: 45, dances: 5, lines: ['어 벌써', '우리가 만난지가', '이렇게나 됐네..ㅎㅎ'] },
  { from: 50, dances: 5, lines: ['축하해!', '최고 레벨까지 키웠어', '항상 고마워 너 덕분이야'] },
] as const

export function getCharacterGrowth(level: number) {
  for (let index = growthStages.length - 1; index > 0; index--) {
    if (level >= growthStages[index].from) return growthStages[index]
  }
  return growthStages[0]
}

// 로그인 화면의 네 터치 동작과 다섯 번째 마우스 올림 동작을 순서대로 재사용합니다.
const growthDances = ['superjump', 'wiggle', 'spin', 'dance', 'hover-dance'] as const
export type GrowthDance = (typeof growthDances)[number]

export function getGrowthDance(level: number, index: number): GrowthDance | null {
  const { dances } = getCharacterGrowth(level)
  return dances === 0 ? null : growthDances[index % dances]
}
