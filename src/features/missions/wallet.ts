import { currentId, tryOn, wornItems, type StudioItem } from '../../pages/shop/catalog'
import { createContext, useContext, useSyncExternalStore } from 'react'

export const AccountId = createContext<number | null>(null)
type Wallet = { balance: number; owned: string[]; outfit: string | null }
const empty: Wallet = { balance: 0, owned: [], outfit: null }
export const drops = (n: number) => '💧' + String(n).replace(/\d/g, d => String.fromCodePoint(0x1d7ce + Number(d)))
// 기존 빗물 잔액과 보유 아이템을 읽기 위해 저장 키를 유지합니다.
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
  if (!raw) return empty
  const state = JSON.parse(raw) as Wallet
  return { ...state, owned: [...new Set(state.owned.map(currentId))], outfit: state.outfit?.split(',').map(currentId).join(',') || null }
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
export function buyItem(id: number | null, item: StudioItem, level: number) {
  return change(id, state => {
    if (level < item.level || state.owned.includes(item.id) || state.balance < item.price) return state
    return { ...state, balance: state.balance - item.price, owned: [...state.owned, item.id] }
  })
}
export function applyItem(id: number | null, item: StudioItem) {
  return change(id, state => state.owned.includes(item.id)
    ? { ...state, outfit: tryOn(state.outfit, item) } : state)
}

export function storeItem(id: number | null, item: StudioItem) {
  return change(id, state => {
    const equipped = wornItems(state.outfit)
    if (!equipped.some(other => other.id === item.id)) return state
    const outfit = equipped.filter(other => other.id !== item.id).map(other => other.id).join(',')
    return { ...state, outfit: outfit || null }
  })
}