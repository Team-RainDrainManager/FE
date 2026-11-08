export type Category = 'headwear' | 'expression' | 'accessory' | 'scene' | 'effect' | 'palette'
export type StudioItem = {
  id: string
  title: string
  category: Category
  color: string
  secondary: string
  tag: 'BASIC' | 'SPECIAL' | 'SEASON'
}

export const DECORATIONS: StudioItem[] = [
  { id: 'h01', title: '새싹 베레모', category: 'headwear', color: '#88B99B', secondary: '#D6EDDC', tag: 'BASIC' },
  { id: 'h02', title: '구름 비니', category: 'headwear', color: '#8FB7E5', secondary: '#E2F0FF', tag: 'BASIC' },
  { id: 'h03', title: '노란 우비', category: 'headwear', color: '#E4B64C', secondary: '#FFF2BE', tag: 'SPECIAL' },
  { id: 'h04', title: '소풍 밀짚모자', category: 'headwear', color: '#BE9565', secondary: '#F7E7C8', tag: 'SEASON' },
  { id: 'h05', title: '밤하늘 캡', category: 'headwear', color: '#526783', secondary: '#DCE6F5', tag: 'SPECIAL' },
  { id: 'h06', title: '리본 머리띠', category: 'headwear', color: '#D99DAD', secondary: '#FFE3EA', tag: 'BASIC' },
  { id: 'h07', title: '개구리 모자', category: 'headwear', color: '#74AE75', secondary: '#DCF4CF', tag: 'SEASON' },
  { id: 'h08', title: '레몬 버킷햇', category: 'headwear', color: '#D6CA64', secondary: '#FAF5D0', tag: 'SPECIAL' },

  { id: 'e01', title: '반짝 미소', category: 'expression', color: '#E9B47E', secondary: '#FFF0DD', tag: 'BASIC' },
  { id: 'e02', title: '윙크', category: 'expression', color: '#9EB8D6', secondary: '#E4F0FF', tag: 'BASIC' },
  { id: 'e03', title: '수줍은 볼', category: 'expression', color: '#DCA0A8', secondary: '#FFE6EA', tag: 'BASIC' },
  { id: 'e04', title: '하트 눈', category: 'expression', color: '#D98FA7', secondary: '#FFE2EC', tag: 'SPECIAL' },
  { id: 'e05', title: '졸린 눈', category: 'expression', color: '#A4A6C4', secondary: '#EFEBFC', tag: 'BASIC' },
  { id: 'e06', title: '깜짝 표정', category: 'expression', color: '#B39BCF', secondary: '#F1E5FF', tag: 'BASIC' },
  { id: 'e07', title: '장난꾸러기', category: 'expression', color: '#7CBAB1', secondary: '#DBF8F2', tag: 'SPECIAL' },
  { id: 'e08', title: '눈물 웃음', category: 'expression', color: '#8FAACF', secondary: '#E2EEFF', tag: 'SPECIAL' },

  { id: 'a01', title: '미니 우산', category: 'accessory', color: '#8EADE2', secondary: '#E3EDFF', tag: 'BASIC' },
  { id: 'a02', title: '물방울 가방', category: 'accessory', color: '#76AFCE', secondary: '#E2F4FA', tag: 'BASIC' },
  { id: 'a03', title: '네잎클로버', category: 'accessory', color: '#7EBA8E', secondary: '#E6F8E8', tag: 'SPECIAL' },
  { id: 'a04', title: '캠핑 랜턴', category: 'accessory', color: '#D0A56B', secondary: '#FFEECF', tag: 'SEASON' },
  { id: 'a05', title: '하늘 풍선', category: 'accessory', color: '#D8A0A8', secondary: '#FFE3E8', tag: 'SPECIAL' },
  { id: 'a06', title: '도토리 친구', category: 'accessory', color: '#B18C71', secondary: '#F4E6D9', tag: 'BASIC' },
  { id: 'a07', title: '작은 꽃다발', category: 'accessory', color: '#BE9ACA', secondary: '#F4E4FA', tag: 'SPECIAL' },
  { id: 'a08', title: '종이비행기', category: 'accessory', color: '#7CA9C6', secondary: '#E7F6FF', tag: 'BASIC' },

  { id: 's01', title: '이른 아침', category: 'scene', color: '#D5B985', secondary: '#FFF3D6', tag: 'BASIC' },
  { id: 's02', title: '비 갠 오후', category: 'scene', color: '#86BCD2', secondary: '#DFF5F5', tag: 'BASIC' },
  { id: 's03', title: '노을 산책', category: 'scene', color: '#D99486', secondary: '#FFE3D5', tag: 'SPECIAL' },
  { id: 's04', title: '별빛 산책로', category: 'scene', color: '#606F9F', secondary: '#DCE5FF', tag: 'SPECIAL' },
  { id: 's05', title: '초록 정원', category: 'scene', color: '#81AB84', secondary: '#E4F3DF', tag: 'BASIC' },
  { id: 's06', title: '도시의 밤', category: 'scene', color: '#6D91AD', secondary: '#DBEDFC', tag: 'SPECIAL' },
  { id: 's07', title: '봄 피크닉', category: 'scene', color: '#B7BC7B', secondary: '#F3F5D9', tag: 'SEASON' },
  { id: 's08', title: '첫눈', category: 'scene', color: '#9DBBD4', secondary: '#EFF7FF', tag: 'SEASON' },

  { id: 'f01', title: '톡톡 물방울', category: 'effect', color: '#7BAFD2', secondary: '#E0F4FF', tag: 'BASIC' },
  { id: 'f02', title: '하트 파티클', category: 'effect', color: '#DF9DAA', secondary: '#FFEBF0', tag: 'BASIC' },
  { id: 'f03', title: '별빛 반짝임', category: 'effect', color: '#B5A8D9', secondary: '#EEE8FF', tag: 'SPECIAL' },
  { id: 'f04', title: '나뭇잎 산책', category: 'effect', color: '#8FBA7F', secondary: '#E6F5DD', tag: 'BASIC' },
  { id: 'f05', title: '솜사탕 구름', category: 'effect', color: '#AFB8D6', secondary: '#F0F3FF', tag: 'SPECIAL' },
  { id: 'f06', title: '작은 무지개', category: 'effect', color: '#D5A1B5', secondary: '#FFEDF4', tag: 'SEASON' },
  { id: 'f07', title: '꿀벌 친구', category: 'effect', color: '#D9B46E', secondary: '#FFF2D6', tag: 'SEASON' },
  { id: 'f08', title: '달빛 조각', category: 'effect', color: '#8E9AC3', secondary: '#E8ECFF', tag: 'SPECIAL' },

  { id: 'p01', title: '오션 블루', category: 'palette', color: '#79A9C8', secondary: '#DFF1FA', tag: 'BASIC' },
  { id: 'p02', title: '민트 라임', category: 'palette', color: '#84B4A2', secondary: '#DFF4EA', tag: 'BASIC' },
  { id: 'p03', title: '라벤더', category: 'palette', color: '#AAA0CB', secondary: '#EFEAF9', tag: 'BASIC' },
  { id: 'p04', title: '버터 옐로', category: 'palette', color: '#D9C078', secondary: '#FFF6D5', tag: 'BASIC' },
  { id: 'p05', title: '코랄 핑크', category: 'palette', color: '#D89B9C', secondary: '#FCE5E5', tag: 'SPECIAL' },
  { id: 'p06', title: '딥 네이비', category: 'palette', color: '#627E9A', secondary: '#DFEAF7', tag: 'SPECIAL' },
  { id: 'p07', title: '피치 크림', category: 'palette', color: '#DDB29A', secondary: '#FFF0E6', tag: 'BASIC' },
  { id: 'p08', title: '모스 그린', category: 'palette', color: '#849F7D', secondary: '#E6F1DE', tag: 'SEASON' },
]
