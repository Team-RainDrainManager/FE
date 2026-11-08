import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useWeeklyScore } from '../../apis/leaderboard'
import {
  useWallet,
  applyItem,
  buyItem,
  storeItem,
} from '../../features/missions/wallet'
import {
  categories,
  DECORATIONS,
  leagueLevel,
  leagueNames,
  tryOn,
  wornItems,
  type StudioItem,
} from './catalog'
import { ShopCharacter, DecorationArt } from './ShopCharacter'
import { StudioDialog, PurchaseReveal } from './PurchaseReveal'
import '../login/LoginPage.css'

const wishes = [
  '이거 완전 제건데요?',
  '너무 마음에 들어요!',
  '저 사주시는 거에요?',
]
const thanks = ['아싸!', '고마워요!', '신난다!']
const dances = ['superjump', 'wiggle', 'spin', 'dance']
export default function ShopPage() {
  const wallet = useWallet()
  return <Studio key={wallet.id ?? 'pending'} wallet={wallet} />
}
function Studio({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [tab, setTab] = useState<'상점' | '옷장'>('상점')
  const [filter, setFilter] = useState('전체')
  const [picked, pick] = useState<StudioItem | null>(null)
  const [step, setStep] = useState<'idle' | 'film' | 'immediate' | 'confirm'>(
    'idle',
  )
  const [reaction, setReaction] = useState({ tick: 0, text: '', motion: '' })
  const [notice, setNotice] = useState('')
  const counters = useRef([0, 0])
  const busy = useRef(false)
  const score = useWeeklyScore(wallet.id)
  const level = score.data === undefined ? -1 : leagueLevel(score.data)
  const outfit = picked ? tryOn(wallet.outfit, picked) : wallet.outfit
  const owned = picked && wallet.owned.includes(picked.id)
  const worn =
    picked && wornItems(wallet.outfit).some((i) => i.id === picked.id)
  const items = DECORATIONS.filter(
    (item) =>
      wallet.owned.includes(item.id) === (tab === '옷장') &&
      (filter === '전체' || item.category === filter),
  )
  const finishFilm = useCallback(() => setStep('immediate'), [])
  function react(applied: boolean) {
    const i = applied ? 1 : 0
    const phrases = applied ? thanks : wishes
    const text = phrases[counters.current[i]++ % phrases.length]
    const motion = dances[Math.floor(Math.random() * dances.length)]
    setReaction((old) => ({ tick: old.tick + 1, text, motion }))
  }
  function clearPreview() {
    pick(null)
    setStep('idle')
    setReaction((old) => ({ ...old, text: '', motion: '' }))
  }
  async function purchase() {
    if (!picked || busy.current) return
    busy.current = true
    try {
      if (await buyItem(wallet.id, picked, level)) {
        setNotice('')
        setStep('film')
      } else setNotice('잔액과 보유 아이템을 확인해 주세요.')
    } catch {
      setNotice('구매를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      busy.current = false
    }
  }
  async function apply() {
    if (!picked || busy.current) return
    busy.current = true
    try {
      if (await applyItem(wallet.id, picked)) {
        setNotice('적용되었습니다')
        react(true)
        pick(null)
      } else setNotice('옷장에서 보유 아이템을 확인해 주세요.')
    } catch {
      setNotice('착용 상태를 저장하지 못했어요.')
    } finally {
      setStep('idle')
      busy.current = false
    }
  }
  return (
    <div className="collect">
      <header>
        <Link to="/profile" aria-label="프로필로 돌아가기">
          ‹
        </Link>
        <h1>꾸미기 상점</h1>
        <output aria-label="보유한 빗물">
          💧 {wallet.id === null ? '—' : wallet.balance}
        </output>
      </header>
      <div className="collect-preview">
        <section className="collect-stage" aria-label="착용 미리보기">
          {reaction.text && <span role="status">{reaction.text}</span>}
          <button
            key={reaction.tick}
            className={'dd-login-character-action--' + reaction.motion}
            aria-label="또랑이와 놀기"
            onClick={() => react(false)}
          >
            <ShopCharacter outfit={outfit} />
          </button>
        </section>
        <div className="collect-controls">
          <div>
            <strong>{picked?.title ?? '나의 또랑이'}</strong>
            <small>
              {level >= 0
                ? leagueNames[level] + ' 리그'
                : score.isError
                  ? '리그 조회 실패'
                  : '리그 확인 중'}{' '}
              · 기기 저장 빗물
            </small>
          </div>
          {tab === '옷장' && picked && worn && (
            <button
              className="store-away"
              onClick={async () => {
                try {
                  if (await storeItem(wallet.id, picked)) {
                    clearPreview()
                    setNotice('옷장에 보관했어요.')
                  }
                } catch {
                  setNotice('보관 상태를 저장하지 못했어요.')
                }
              }}
            >
              보관
            </button>
          )}
          {score.isError && (
            <button onClick={() => void score.refetch()}>재시도</button>
          )}
          <button
            className="collect-primary"
            disabled={
              !picked ||
              wallet.id === null ||
              (tab === '상점'
                ? !!owned ||
                  level < picked.level ||
                  wallet.balance < picked.price
                : !owned || !!worn)
            }
            onClick={() =>
              tab === '상점' ? void purchase() : setStep('confirm')
            }
          >
            {tab === '상점'
              ? picked
                ? '💧 ' + picked.price + ' 구매'
                : '구매'
              : worn
                ? '착용 중'
                : '적용'}
          </button>
        </div>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className="collect-filters" aria-label="종류">
        {['전체', ...categories].map((c) => (
          <button
            key={c}
            aria-pressed={filter === c}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <section className="collect-grid" aria-label={tab + ' 아이템'}>
        {items.map((item) => (
          <button
            key={item.id}
            aria-pressed={picked?.id === item.id}
            onClick={() => {
              pick(item)
              setNotice('')
              react(false)
            }}
          >
            <span
              style={{
                background:
                  'linear-gradient(145deg,' + item.light + ',#fff8 110%)',
              }}
            >
              {item.slot === 4 || item.slot === 2 ? (
                <ShopCharacter outfit={item.id} />
              ) : (
                <DecorationArt item={item} />
              )}
            </span>
            <strong>{item.title}</strong>
            <small>
              {tab === '옷장'
                ? wornItems(wallet.outfit).some((i) => i.id === item.id)
                  ? '착용 중'
                  : '보관 중'
                : leagueNames[item.level] + ' · 💧 ' + item.price}
            </small>
          </button>
        ))}
      </section>
      {!items.length && (
        <p>
          {tab === '옷장'
            ? '이 칸에 보관한 아이템이 없어요.'
            : '이 칸의 아이템을 모두 보유하고 있어요.'}
        </p>
      )}
      <nav aria-label="꾸미기 메뉴">
        {(['상점', '옷장'] as const).map((t) => (
          <button
            key={t}
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => {
              setTab(t)
              setFilter('전체')
              clearPreview()
              setNotice('')
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {picked && step === 'film' && (
        <PurchaseReveal item={picked} onDone={finishFilm} />
      )}
      {picked && (step === 'immediate' || step === 'confirm') && (
        <StudioDialog
          label="아이템 적용"
          onCancel={() =>
            step === 'immediate' ? clearPreview() : setStep('idle')
          }
        >
          <h2>
            {step === 'immediate'
              ? '구매한 아이템을 즉시 적용할까요?'
              : '적용하시겠습니까?'}
          </h2>
          <div>
            <button
              onClick={() =>
                step === 'immediate' ? clearPreview() : setStep('idle')
              }
            >
              아니오
            </button>
            <button className="collect-primary" onClick={() => void apply()}>
              예
            </button>
          </div>
        </StudioDialog>
      )}
    </div>
  )
}
