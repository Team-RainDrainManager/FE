import { createContext, useContext, useSyncExternalStore } from 'react'

export const AccountId = createContext<number | null>(null)
export const missions = [
  { id: 'photo', title: '빗물받이 사진 1장 찍기', reward: 1 },
  { id: 'substitute', title: '빗물받이 대신점검 1회 하기', reward: 3 },
  { id: 'clean', title: '빗물받이 개인점검 청소 하기', reward: 5 },
] as const
type Mission = typeof missions[number]['id']
type Wallet = { balance: number; owned: string[]; outfit: string | null; day: string; done: Mission[] }
const empty: Wallet = { balance: 0, owned: [], outfit: null, day: '', done: [] }
const formatDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
export const today = () => formatDay.format(new Date())
export const drops = (n: number) => '💧' + String(n).replace(/\d/g, d => String.fromCodePoint(0x1d7ce + Number(d)))
const key = (id: number) => 'ddorang:mission-wallet:v1:' + id
function snapshot(id: number | null) {
  try { return id === null ? null : localStorage.getItem(key(id)) } catch { return null }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener('wallet-change', listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener('wallet-change', listener)
  }
}
function decode(raw: string | null): Wallet {
  return raw ? JSON.parse(raw) as Wallet : empty
}
export function useWallet() {
  const id = useContext(AccountId)
  const raw = useSyncExternalStore(subscribe, () => snapshot(id))
  return { id, ...decode(raw) }
}
async function change(id: number | null, update: (s: Wallet) => Wallet) {
  if (id === null) return false
  return navigator.locks.request(key(id), () => {
    const state = decode(localStorage.getItem(key(id)))
    const next = update(state)
    if (next === state) return false
    localStorage.setItem(key(id), JSON.stringify(next))
    window.dispatchEvent(new Event('wallet-change'))
    return true
  })
}
export function award(id: number | null, mission: Mission) {
  const day = today()
  const reward = missions.find(m => m.id === mission)!.reward
  return change(id, state => {
    const done = state.day === day ? state.done : []
    return done.includes(mission) ? state : {
      ...state, day, done: [...done, mission], balance: state.balance + reward,
    }
  })
}
export function wearOrBuy(id: number | null, item: string, price: number) {
  return change(id, state => {
    if (state.owned.includes(item)) return { ...state, outfit: item }
    if (price > state.balance) return state
    return { ...state, balance: state.balance - price, owned: [...state.owned, item], outfit: item }
  })
}
