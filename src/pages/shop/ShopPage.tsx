import { useMemo, useState, type CSSProperties } from 'react'
import { CURRENT_SOCIAL_USER_ID, MOCK_SOCIAL_USERS } from '../../mocks/social'
import { Link } from 'react-router'
import happyCharacter from '../../assets/characters/states/happy.svg'
import './shop-studio.css'
import './shop-motion.css'
import './shop-compact.css'

type Category = 'headwear' | 'expression' | 'accessory' | 'scene' | 'effect' | 'palette'
type StudioItem = {
  id: string
  title: string
  category: Category
  color: string
  secondary: string
  tag: 'BASIC' | 'SPECIAL' | 'SEASON'
}

const CATEGORY_LIST: { id: Category | 'all'; title: string; caption: string }[] = [
  { id: 'all', title: '전체', caption: 'ALL' },
  { id: 'headwear', title: '모자', caption: 'HEADWEAR' },
  { id: 'expression', title: '표정', caption: 'EXPRESSIONS' },
  { id: 'accessory', title: '소품', caption: 'ACCESSORIES' },
  { id: 'scene', title: '배경', caption: 'SCENES' },
  { id: 'effect', title: '효과', caption: 'EFFECTS' },
  { id: 'palette', title: '컬러', caption: 'COLORS' },
]

const DECORATIONS: StudioItem[] = [
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

// 시연용 상품 해금·가격 정책입니다. 실제 구매/보상 정책과 연결되지 않습니다.
const SHOP_LEAGUES = ['WOOD','STONE','IRON','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND'] as const
const SHOP_LEVEL_MIN = [0,150,300,450,600,750,900,1050] as const
const SHOP_PRICE_BASE = [4,8,14,23,35,53,80,120] as const
const SHOP_ITEM_LEVELS: Record<string, number> = {
  h01:0,h02:0,h03:3,h04:2,h05:6,h06:1,h07:4,h08:5,
  e01:0,e02:0,e03:1,e04:4,e05:0,e06:1,e07:3,e08:5,
  a01:0,a02:1,a03:3,a04:2,a05:5,a06:0,a07:6,a08:1,
  s01:0,s02:0,s03:4,s04:7,s05:1,s06:6,s07:3,s08:5,
  f01:0,f02:1,f03:6,f04:2,f05:4,f06:7,f07:3,f08:5,
  p01:0,p02:0,p03:2,p04:1,p05:4,p06:6,p07:1,p08:5,
}
const SHOP_BALANCE_KEY = 'ddorang:shop-demo-water-v1'
const SHOP_OWNED_KEY = 'ddorang:shop-demo-owned-v1'
function requiredLevel(item: StudioItem): number { return SHOP_ITEM_LEVELS[item.id] ?? 0 }
function itemPrice(item: StudioItem): number {
  const level = requiredLevel(item)
  return SHOP_PRICE_BASE[level] + (item.category === 'scene' || item.category === 'effect' ? 3 : 0) + (item.tag === 'SEASON' ? 2 : 0)
}
function initialWallet(): number {
  try {
    const saved = localStorage.getItem(SHOP_BALANCE_KEY)
    if (saved === null) return 45
    const value = JSON.parse(saved) as unknown
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 45
  } catch { return 45 }
}
function initialOwned(): string[] {
  try {
    const saved = localStorage.getItem(SHOP_OWNED_KEY)
    const value: unknown = saved ? JSON.parse(saved) : []
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && DECORATIONS.some(item => item.id === id)) : []
  } catch { return [] }
}
function saveDemoPurchase(balance: number, owned: string[]) {
  try {
    localStorage.setItem(SHOP_BALANCE_KEY, JSON.stringify(balance))
    localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify(owned))
  } catch { /* 스토리지 제한 시 현재 화면의 시연 상태만 유지합니다. */ }
}

function ArrowIcon({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

function DecorationArt({ item, size = 'small' }: { item: StudioItem; size?: 'small' | 'large' }) {
  const foreground = item.color
  const light = item.secondary
  const number = Number(item.id.slice(1))
  const stroke = { stroke: foreground, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  return (
    <svg viewBox="0 0 96 96" role="img" aria-label={`${item.title} 일러스트`} className={`dshop-art dshop-art--${size}`}>
      {item.category === 'headwear' && (
        <>
          {number === 1 && <><path d="M19 57c3-21 14-34 31-34 18 0 26 13 28 34Z" fill={light} {...stroke}/><path d="M18 61h62" {...stroke} strokeWidth="7"/><path d="M48 23q-3-14 10-15" fill="none" {...stroke}/><path d="M54 13q12-11 23 0-11 14-23 0" fill="#8ec49d"/></>}
          {number === 2 && <><path d="M21 60V43c0-19 12-31 27-31s27 12 27 31v17" fill={light} {...stroke}/><rect x="18" y="53" width="60" height="17" rx="8" fill={foreground}/><circle cx="48" cy="14" r="9" fill={foreground}/></>}
          {number === 3 && <><path d="M18 72q-6-54 30-55 38 0 30 55l-16-7-28 1Z" fill={light} {...stroke}/><path d="M30 61q18-10 36 0" fill="none" {...stroke}/><path d="M21 72h54" {...stroke}/></>}
          {number === 4 && <><path d="M27 53 34 23h28l7 30Z" fill={light} {...stroke}/><ellipse cx="48" cy="58" rx="39" ry="8" fill={foreground}/><path d="M32 43h33" stroke="#fff3db" strokeWidth="6"/></>}
          {number === 5 && <><path d="M21 58q3-37 29-37t29 37Z" fill={foreground}/><path d="M35 55q31 1 45 6" {...stroke}/><path d="m49 31 2.5 7 7 2-7 2.5L49 49l-2-6.5-7-2.5 7-2Z" fill={light}/></>}
          {number === 6 && <><path d="M13 52q30-20 70 0" fill="none" {...stroke} strokeWidth="7"/><path d="M48 35q-25-25-31-8-4 18 28 15" fill={foreground}/><path d="M48 35q25-25 31-8 4 18-28 15" fill={light} {...stroke}/><circle cx="48" cy="38" r="7" fill={foreground}/></>}
          {number === 7 && <><path d="M19 63q0-42 29-42t29 42Z" fill={light} {...stroke}/><circle cx="32" cy="22" r="10" fill={foreground}/><circle cx="64" cy="22" r="10" fill={foreground}/><circle cx="33" cy="39" r="3" fill="#375f43"/><circle cx="63" cy="39" r="3" fill="#375f43"/><path d="M43 51q6 5 11 0" stroke="#375f43" strokeWidth="3" fill="none"/></>}
          {number === 8 && <><path d="M24 33h48l-5 24H29Z" fill={light} {...stroke}/><path d="M15 59q34 17 66 0" fill="none" {...stroke} strokeWidth="8"/><path d="M31 37h34" stroke="#fff6ca" strokeWidth="4"/></>}
        </>
      )}
      {item.category === 'expression' && (
        <>
          <circle cx="48" cy="48" r="31" fill={light} {...stroke} strokeWidth="3" />
          {number === 2 ? <><path d="M26 39q10-10 20 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="62" cy="40" r="3.5" fill="#324957" /></>
            : number === 4 ? <><path d="m25 35 8-7 8 7-8 8Z M55 35l8-7 8 7-8 8Z" fill="#d57992"/></>
            : number === 5 ? <><path d="M28 39q8 7 16 0 M54 39q8 7 16 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round"/></>
            : number === 6 ? <><circle cx="34" cy="39" r="5" fill="#324957"/><circle cx="62" cy="39" r="5" fill="#324957"/></>
            : number === 7 ? <><path d="m30 32 11 8-11 2 M55 39l11-7" fill="none" stroke="#324957" strokeWidth="4" strokeLinecap="round"/></>
            : <><circle cx="34" cy="40" r="3.5" fill="#324957"/><circle cx="62" cy="40" r="3.5" fill="#324957"/></>}
          {number === 5 ? <path d="M37 60h22" stroke="#324957" strokeWidth="4" strokeLinecap="round" />
            : number === 6 ? <ellipse cx="48" cy="59" rx="6" ry="9" fill="#324957"/>
            : number === 8 ? <><path d="M33 53q15 18 30 0" stroke="#324957" strokeWidth="4" fill="none"/><path d="M65 44q10 12 2 16-8 1-2-16" fill="#89c6e3"/></>
            : <path d="M33 53q15 17 30 0" stroke="#324957" strokeWidth="4" fill="none" strokeLinecap="round" />}
          {number === 3 && <><ellipse cx="25" cy="50" rx="7" ry="4" fill="#e5a0b0"/><ellipse cx="70" cy="50" rx="7" ry="4" fill="#e5a0b0"/></>}
        </>
      )}
      {item.category === 'accessory' && (
        <>
          {number === 1 && <><path d="M13 48Q48 4 83 48Z" fill={foreground}/><path d="M48 48v30q0 11-12 7" fill="none" {...stroke}/><path d="M13 48q9-8 18 0 8-8 17 0 8-8 17 0 9-8 18 0" fill="none" stroke={light} strokeWidth="3"/></>}
          {number === 2 && <><rect x="27" y="33" width="42" height="42" rx="11" fill={light} {...stroke}/><path d="M36 34q0-15 12-15t12 15" fill="none" {...stroke}/><path d="M48 46q-13 13 0 19 13-6 0-19Z" fill={foreground}/></>}
          {number === 3 && <><path d="M48 47q-33-32-35-9-1 17 32 14Q15 74 31 80q16 6 19-26 4 31 20 26 15-7-16-28 33 4 30-14-4-23-36 9Z" fill={foreground}/><path d="M48 50v34" {...stroke}/></>}
          {number === 4 && <><rect x="26" y="32" width="44" height="44" rx="9" fill={light} {...stroke}/><path d="M36 31v-9h24v9 M36 77h24" {...stroke} fill="none"/><rect x="38" y="44" width="20" height="21" rx="7" fill="#fff3d0"/></>}
          {number === 5 && <><path d="M48 15c-38 3-27 45 0 47 27-2 38-44 0-47Z" fill={light} {...stroke}/><path d="M48 62q-6 16 4 24" stroke="#6b8092" strokeWidth="3" fill="none"/></>}
          {number === 6 && <><path d="M25 40q23-24 46 0l-5 31q-19 17-36 0Z" fill={light} {...stroke}/><path d="M25 40q5-20 23-20t23 20Z" fill={foreground}/><path d="M35 40q14 6 27 0" stroke={light} strokeWidth="4" fill="none"/></>}
          {number === 7 && <><path d="M46 77 34 48 62 48Z" fill="#87bda4"/><path d="M48 49v-22" {...stroke}/><circle cx="48" cy="22" r="10" fill={foreground}/><circle cx="30" cy="35" r="9" fill={light}/><circle cx="66" cy="35" r="9" fill={foreground}/><circle cx="48" cy="44" r="8" fill={light}/></>}
          {number === 8 && <><path d="M10 47 85 20 64 77 49 56 36 72 37 50Z" fill={light} {...stroke}/><path d="M37 50 85 20 49 56" fill="none" {...stroke}/></>}
        </>
      )}
      {item.category === 'scene' && (
        <>
          <rect x="13" y="14" width="70" height="68" rx="17" fill={light} />
          {number === 1 && <><circle cx="65" cy="35" r="13" fill={foreground}/><path d="M18 65q30-26 60 0" fill="none" {...stroke}/></>}
          {number === 2 && <><path d="M21 47q-4-16 16-18 12-17 25-4 17-1 17 16-1 13-23 13H36Z" fill="white" stroke={foreground} strokeWidth="3"/><path d="M30 62v9 M49 59v9 M66 61v9" {...stroke}/></>}
          {number === 3 && <><circle cx="55" cy="40" r="16" fill={foreground}/><path d="M18 67q20-18 32-4 16-23 28 2" fill="none" {...stroke}/></>}
          {number === 4 && <><path d="m42 33 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill={foreground}/><circle cx="63" cy="31" r="4" fill="white"/><circle cx="26" cy="57" r="3" fill="white"/><path d="M24 71h49" {...stroke}/></>}
          {number === 5 && <><path d="M48 76V39 M48 57Q33 45 27 53 M48 50Q64 35 71 43" {...stroke} fill="none"/><circle cx="48" cy="33" r="14" fill={foreground}/><path d="M19 75h57" {...stroke}/></>}
          {number === 6 && <><path d="M22 74V42h14v32 M42 74V28h18v46 M65 74V47h12v27" stroke={foreground} strokeWidth="3" fill="none"/><path d="M27 48h4 M48 38h5 M48 48h5 M69 55h4" stroke={foreground} strokeWidth="3"/></>}
          {number === 7 && <><path d="M18 72q27-38 61 0" fill="none" {...stroke}/><path d="M48 70V31" {...stroke}/><path d="M48 31q-26-19-33 5h66Q71 12 48 31Z" fill={foreground}/></>}
          {number === 8 && <><path d="M26 36h44 M24 60h48" {...stroke} strokeWidth="2"/><path d="m49 23 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill={foreground}/><circle cx="30" cy="68" r="4" fill="white"/><circle cx="66" cy="60" r="4" fill="white"/></>}
        </>
      )}
      {item.category === 'effect' && (
        <>
          {number === 1 && <><path d="M48 13Q27 48 27 61a21 21 0 0 0 42 0Q69 48 48 13Z" fill={foreground}/><circle cx="42" cy="61" r="9" fill={light}/></>}
          {number === 2 && <><path d="M48 77 20 49Q7 29 26 22q15-4 22 9 7-13 22-9 19 7 6 27Z" fill={foreground}/><circle cx="33" cy="39" r="5" fill={light}/></>}
          {number === 3 && <><path d="m48 9 9 30 30 9-30 9-9 30-9-30-30-9 30-9Z" fill={foreground}/><path d="m75 10 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill={light}/></>}
          {number === 4 && <><path d="M23 75Q7 36 76 18 77 73 23 75Z" fill={foreground}/><path d="M22 79q24-30 53-60" fill="none" stroke={light} strokeWidth="4"/></>}
          {number === 5 && <><path d="M24 65q-19 1-17-15 1-17 19-16 7-25 27-17 12-6 22 12 20 3 13 23-3 14-22 13Z" fill={foreground}/><path d="M30 54h34" fill="none" stroke={light} strokeWidth="4"/></>}
          {number === 6 && <><path d="M17 70Q14 24 48 24t31 46" fill="none" stroke={foreground} strokeWidth="8" strokeLinecap="round"/><path d="M28 70Q25 35 48 35t20 35" fill="none" stroke="#EAC280" strokeWidth="7"/><path d="M39 70Q36 46 48 46t9 24" fill="none" stroke="#9ECBB0" strokeWidth="7"/></>}
          {number === 7 && <><ellipse cx="48" cy="50" rx="19" ry="25" fill={foreground}/><path d="M36 31v37 M48 27v46 M60 31v37" stroke="#fff1c7" strokeWidth="6"/><ellipse cx="29" cy="48" rx="12" ry="9" fill={light} opacity=".8"/><ellipse cx="67" cy="48" rx="12" ry="9" fill={light} opacity=".8"/><circle cx="42" cy="46" r="2.5"/><circle cx="54" cy="46" r="2.5"/></>}
          {number === 8 && <><path d="M64 13Q33 15 32 48t32 35Q38 88 25 65t8-40Q45 10 64 13Z" fill={foreground}/><circle cx="69" cy="28" r="5" fill={light}/><circle cx="72" cy="60" r="3" fill={light}/></>}
        </>
      )}
      {item.category === 'palette' && (
        <>
          <circle cx="39" cy="47" r="31" fill={foreground} />
          <circle cx="58" cy="39" r="25" fill={light} opacity=".95" />
          <circle cx="33" cy="64" r="18" fill={foreground} opacity=".68" />
          <circle cx="64" cy="65" r="9" fill="#fff" opacity=".72" />
        </>
      )}
    </svg>
  )
}

/** The selected item is previewed ON the character instead of in a detached sticker. */
function ShopCharacter({ item }: { item: StudioItem }) {
  const expression = item.category === 'expression' ? Number(item.id.slice(1)) : 1
  const paletteShift = item.category === 'palette'
    ? [0, 104, 55, 186, 260, -18, 215, 130][Number(item.id.slice(1)) - 1] ?? 0
    : 0
  const faceStroke = { stroke: '#1E2B38', strokeWidth: 3.6, fill: 'none' as const, strokeLinecap: 'round' as const }

  return (
    <div className="dshop-avatar" style={{ '--dshop-palette-rotate': `${paletteShift}deg` } as CSSProperties}>
      {item.category === 'scene' && <span className="dshop-avatar__scene" aria-hidden="true"><DecorationArt item={item} /></span>}
      <svg className="dshop-avatar__body" viewBox="0 0 200 200" role="img" aria-label={`${item.title}을 적용한 또랑이 미리보기`}>
        <image href={happyCharacter} width="200" height="200" />
        {/* Keep the original character asset; redraw only the facial area. */}
        <rect x="60" y="90" width="80" height="41" fill="#6A92B5" />
        <g className="dshop-avatar__eyes">
          {expression === 2 ? (
            <><path d="M73 104q9-8 18 0" {...faceStroke}/><circle cx="119" cy="104" r="4.2" fill="#1E2B38" /></>
          ) : expression === 4 ? (
            <><path d="M73 103l8-8 9 8-9 10Z M110 103l8-8 9 8-9 10Z" fill="#E5718E" /></>
          ) : expression === 5 ? (
            <><path d="M73 103q8 7 17 0 M111 103q8 7 17 0" {...faceStroke}/></>
          ) : expression === 6 ? (
            <><circle cx="82" cy="104" r="5.6" fill="#1E2B38"/><circle cx="118" cy="104" r="5.6" fill="#1E2B38"/></>
          ) : expression === 7 ? (
            <><path d="m73 98 18 6-18 5 M111 105l17-9" {...faceStroke}/></>
          ) : (
            <><path d="M74 106q8-11 16 0 M110 106q8-11 16 0" {...faceStroke}/></>
          )}
        </g>
        {expression === 6 ? <ellipse cx="100" cy="120" rx="6" ry="9" fill="#1E2B38" />
          : expression === 5 ? <path d="M93 120h14" {...faceStroke}/>
          : expression === 7 ? <><path d="M91 119q9 12 18 0" {...faceStroke}/><path d="M98 122q3-4 7 1" stroke="#F58CA2" strokeWidth="3" fill="none" /></>
          : <path d="M90 118q10 14 20 0" {...faceStroke}/>
        }
        <ellipse cx="68" cy="119" rx="6.5" ry="3.5" fill="#F4A3B4" />
        <ellipse cx="132" cy="119" rx="6.5" ry="3.5" fill="#F4A3B4" />
        {expression === 3 && <><ellipse cx="73" cy="121" rx="9" ry="5" fill="#F58AA6" opacity=".84"/><ellipse cx="127" cy="121" rx="9" ry="5" fill="#F58AA6" opacity=".84"/></>}
        {expression === 8 && <><path d="M125 110q11 8 0 16-8-2 0-16Z" fill="#9EDAF0"/><path d="M75 110q-10 8 0 16 8-2 0-16Z" fill="#9EDAF0"/></>}
      </svg>
      {item.category === 'headwear' && <span className="dshop-avatar__wear" aria-hidden="true"><DecorationArt item={item} size="large"/></span>}
      {item.category === 'accessory' && <span className="dshop-avatar__held" aria-hidden="true"><DecorationArt item={item} size="large" /></span>}
      {item.category === 'effect' && <span className="dshop-avatar__effect" aria-hidden="true"><DecorationArt item={item} size="large" /></span>}
      <span className="dshop-avatar__blush" aria-hidden="true">♥</span>
    </div>
  )
}

export default function ShopPage() {
  // 시연용 로컬 재화/구매 상태입니다. 실제 서버 계정·재화와 연결되지 않습니다.
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [previewId, setPreviewId] = useState('h01')
  const [excitementTick, setExcitementTick] = useState(0)
  const [wallet, setWallet] = useState(initialWallet)
  const [ownedIds, setOwnedIds] = useState(initialOwned)
  const [purchaseNotice, setPurchaseNotice] = useState('')
  const myDemoScore = MOCK_SOCIAL_USERS.find(user => user.id === CURRENT_SOCIAL_USER_ID)?.weeklyScore ?? 0
  const myDemoLeague = SHOP_LEVEL_MIN.reduce<number>((level, min, index) => myDemoScore >= min ? index : level, 0)
  function buyDemoItem(item: StudioItem) {
    const level = requiredLevel(item)
    const price = itemPrice(item)
    if (level > myDemoLeague || ownedIds.includes(item.id) || wallet < price) return
    const nextBalance = wallet - price
    const nextOwned = [...ownedIds, item.id]
    setWallet(nextBalance)
    setOwnedIds(nextOwned)
    saveDemoPurchase(nextBalance, nextOwned)
    setPreviewId(item.id)
    setExcitementTick(value => value + 1)
    setPurchaseNotice(`${item.title} 미리보기 구매 완료 · 빗물 ${price}개 사용 (시연)`)
  }
  const preview = DECORATIONS.find((item) => item.id === previewId) ?? DECORATIONS[0]
  const visibleItems = useMemo(
    () => (category === 'all' ? DECORATIONS : DECORATIONS.filter((item) => item.category === category)),
    [category],
  )

  return (
    <div className="dshop-page">
      <div className="dshop-container">
        <header className="dshop-heading">
          <Link to="/profile" className="dshop-back" aria-label="프로필로 돌아가기"><ArrowIcon direction="left" /></Link>
          <div className="dshop-heading__text"><span>MY DDORANG</span><strong>꾸미기 스튜디오</strong></div>
          <span className="dshop-eyebrow-pill">시연용 상점</span>
        </header>

        <section className="dshop-hero" aria-labelledby="dshop-title">
          <div className="dshop-hero__copy">
            <p className="dshop-kicker"><span className="dshop-kicker__line" /> PERSONALIZE YOUR DDORANG</p>
            <h1 id="dshop-title">리그를 키우고,<br /><em>또랑이를 꾸며요.</em></h1>
            <p>리그가 올라갈수록 더 특별한 아이템이 열려요.</p>
          </div>
          <div className="dshop-stage" style={{ '--stage-accent': preview.color, '--stage-light': preview.secondary } as CSSProperties}>
            <span className="dshop-stage__ring dshop-stage__ring--one" aria-hidden="true" />
            <span className="dshop-stage__ring dshop-stage__ring--two" aria-hidden="true" />
            <span className="dshop-stage__star dshop-stage__star--one" aria-hidden="true">✦</span>
            <span className="dshop-stage__star dshop-stage__star--two" aria-hidden="true">✧</span>
            <button type="button" key={`${preview.id}-${excitementTick}`} className={`dshop-stage__character${excitementTick > 0 ? ' is-excited' : ''}`} onClick={() => setExcitementTick(value => value + 1)} aria-label="또랑이와 놀기">
              <ShopCharacter item={preview} />
            </button>
            <div className="dshop-stage__caption"><span className="dshop-stage__caption-dot" /> 또랑이의 새로운 모습 <strong>{preview.title}</strong></div>
          </div>
          <div className="dshop-hero__footer"><span>01 / MAKE IT YOURS</span><span>48 STYLES</span></div>
        </section>

        <div className="dshop-preview-note" role="note">
          <span className="dshop-preview-note__symbol" aria-hidden="true">i</span>
          <p><strong>시연용 상점입니다.</strong> 빗물·구매·리그는 브라우저 시연 데이터이며 실제 계정 포인트는 차감되지 않습니다.</p>
        </div>

        <div className="dshop-wallet" aria-label="시연용 빗물 잔액">
          <div><span className="dshop-wallet-droplet" aria-hidden="true">💧</span><span><small>시연용 빗물</small><strong>{wallet.toLocaleString('ko-KR')}개</strong></span></div>
          <span className="dshop-wallet-level">현재 {SHOP_LEAGUES[myDemoLeague]} 리그</span>
        </div>
        {purchaseNotice && <p className="dshop-purchase-notice" role="status">{purchaseNotice}</p>}
        <section className="dshop-collection" aria-labelledby="dshop-collection-title">
          <div className="dshop-section-heading">
            <div><span className="dshop-section-heading__eyebrow">THE COLLECTION</span><h2 id="dshop-collection-title">꾸미기 컬렉션 <span>{DECORATIONS.length}</span></h2></div>
            <p>리그별 해금 · 빗물 가격</p>
          </div>
          <div className="dshop-filters" role="group" aria-label="꾸미기 아이템 종류">
            {CATEGORY_LIST.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                aria-pressed={category === tab.id}
                className={`dshop-filter${category === tab.id ? ' is-selected' : ''}`}
              >{tab.title}</button>
            ))}
          </div>
          <div className="dshop-collection__meta"><span>{CATEGORY_LIST.find((tab) => tab.id === category)?.caption}</span><span>{visibleItems.length} ITEMS</span></div>
          <div className="dshop-grid">
            {visibleItems.map(item => {
              const level = requiredLevel(item)
              const locked = level > myDemoLeague
              const owned = ownedIds.includes(item.id)
              const price = itemPrice(item)
              const affordable = wallet >= price
              return (
                <article key={item.id} className={`dshop-item dshop-item--tier-${level}${previewId === item.id ? ' is-previewed' : ''}${locked ? ' is-locked' : ''}`}>
                  <button type="button" className="dshop-item__preview" aria-pressed={previewId === item.id} aria-label={`${item.title} 미리보기${locked ? `, ${SHOP_LEAGUES[level]} 리그에서 해금` : ''}`} onClick={() => { setPreviewId(item.id); setExcitementTick(value => value + 1) }}>
                    <span className="dshop-item__art" style={{ '--item-color': item.color, '--item-light': item.secondary } as CSSProperties}>
                      <span className="dshop-item__badge">{SHOP_LEAGUES[level]}</span>
                      <DecorationArt item={item} />
                      {locked && <span className="dshop-item__lock" aria-hidden="true">잠김</span>}
                    </span>
                  </button>
                  <div className="dshop-item__information">
                    <strong className="dshop-item__label">{item.title}</strong>
                    <span className="dshop-item__price"><span aria-hidden="true">💧</span>{price}개</span>
                  </div>
                  <button type="button" className={`dshop-item__buy${owned ? ' is-owned' : ''}`} disabled={locked || owned || !affordable} onClick={() => buyDemoItem(item)} aria-label={`${item.title} ${price}개 빗물로 시연 구매`}>
                    {locked ? `${SHOP_LEAGUES[level]} 해금` : owned ? '보유 중' : affordable ? '시연 구매' : '빗물 부족'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        <footer className="dshop-footer">
          <div className="dshop-footer__icon" aria-hidden="true">✳</div>
          <div><strong>리그를 해금하며 새로운 꾸미기를 만나보세요.</strong><p>실제 구매와 빗물 차감은 추후 서버 API 연결이 필요합니다.</p></div>
        </footer>
      </div>
    </div>
  )
}
