import { useMemo, useState, type CSSProperties } from 'react'
import { CURRENT_SOCIAL_USER_ID, MOCK_SOCIAL_USERS } from '../../mocks/social'
import { Link } from 'react-router'
import { DECORATIONS, type Category, type StudioItem } from './catalog'
import { ShopCharacter, DecorationArt } from './ShopCharacter'
import { useWallet, wearOrBuy } from '../../features/missions/wallet'
import './shop-studio.css'
import './shop-motion.css'
import './shop-compact.css'

const CATEGORY_LIST: { id: Category | 'all'; title: string; caption: string }[] = [
  { id: 'all', title: '전체', caption: 'ALL' },
  { id: 'headwear', title: '모자', caption: 'HEADWEAR' },
  { id: 'expression', title: '표정', caption: 'EXPRESSIONS' },
  { id: 'accessory', title: '소품', caption: 'ACCESSORIES' },
  { id: 'scene', title: '배경', caption: 'SCENES' },
  { id: 'effect', title: '효과', caption: 'EFFECTS' },
  { id: 'palette', title: '컬러', caption: 'COLORS' },
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
function requiredLevel(item: StudioItem): number { return SHOP_ITEM_LEVELS[item.id] ?? 0 }
function itemPrice(item: StudioItem): number {
  const level = requiredLevel(item)
  return SHOP_PRICE_BASE[level] + (item.category === 'scene' || item.category === 'effect' ? 3 : 0) + (item.tag === 'SEASON' ? 2 : 0)
}
function ArrowIcon({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

export default function ShopPage() {
  // 시연용 로컬 재화/구매 상태입니다. 실제 서버 계정·재화와 연결되지 않습니다.
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [previewSelection, setPreviewId] = useState<string | null>(null)
  const [excitementTick, setExcitementTick] = useState(0)
  const { id, balance: wallet, owned: ownedIds, outfit } = useWallet()
  const previewId = previewSelection ?? outfit ?? 'h01'
  const [purchaseNotice, setPurchaseNotice] = useState('')
  const myDemoScore = MOCK_SOCIAL_USERS.find(user => user.id === CURRENT_SOCIAL_USER_ID)?.weeklyScore ?? 0
  const myDemoLeague = SHOP_LEVEL_MIN.reduce<number>((level, min, index) => myDemoScore >= min ? index : level, 0)
  async function buyDemoItem(item: StudioItem) {
    const level = requiredLevel(item)
    const price = itemPrice(item)
    if (level > myDemoLeague) return
    try {
      if (!await wearOrBuy(id, item.id, price)) return
    } catch {
      setPurchaseNotice('꾸미기를 저장하지 못했어요. 다시 시도해 주세요.')
      return
    }
    setPreviewId(item.id)
    setExcitementTick(value => value + 1)
    setPurchaseNotice(`${item.title}을 착용했어요.`)
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
                  <button type="button" className={`dshop-item__buy${owned ? ' is-owned' : ''}`} disabled={id === null || locked || outfit === item.id || (!owned && !affordable)} onClick={() => buyDemoItem(item)} aria-label={`${item.title} ${price}개 빗물로 시연 구매`}>
                    {locked ? `${SHOP_LEAGUES[level]} 해금` : outfit === item.id ? '착용 중' : owned ? '착용하기' : affordable ? '시연 구매' : '빗물 부족'}
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
