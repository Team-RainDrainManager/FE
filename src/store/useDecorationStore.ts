import { create } from 'zustand'

export const DECORATIONS = [
  {id:'leaf',name:'초록 리본',symbol:'🎀',price:20},
  {id:'sun',name:'햇살 배지',symbol:'☀️',price:35},
  {id:'umbrella',name:'작은 우산',symbol:'☂️',price:50},
  {id:'star',name:'반짝 별',symbol:'⭐',price:70},
] as const
export type DecorationId = typeof DECORATIONS[number]['id']
type Saved = {drops:number; owned:DecorationId[];equipped:Record<number,DecorationId>; checkedIn:string}
const KEY='ddorang:shop-demo'
function read():Saved {
  try {
    const item = JSON.parse(localStorage.getItem(KEY)??'null') as Partial<Saved>|null
    if (item && typeof item.drops==='number' && Array.isArray(item.owned)) return {
      drops:Math.max(0,item.drops),owned:item.owned.filter((id):id is DecorationId=>DECORATIONS.some(d=>d.id===id)),equipped:item.equipped??{},checkedIn:item.checkedIn??''
    }
  } catch { /* ignore */ }
  return {drops:0,owned:[],equipped:{},checkedIn:''}
}
function write(s:Saved) { try {localStorage.setItem(KEY,JSON.stringify(s))} catch { /* ignore */ } }
const initial=read()
export const useDecorationStore=create<Saved & {
  checkIn:()=>boolean
  buy:(id:DecorationId)=>boolean
  equip:(drainId:number,id:DecorationId|null)=>void
  reset:()=>void
}>(set=>({
  ...initial,
  reset:()=>{ const empty:Saved={drops:0,owned:[],equipped:{},checkedIn:''};try{localStorage.removeItem(KEY)}catch{/* ignore */}set(empty) },
  checkIn:()=>{
    // 로컬 체험 재화입니다. 서버 기록/실제 보상이 아닙니다.
    const date=new Date().toLocaleDateString('sv-SE')
    let success=false
    set(s=>{
      if(s.checkedIn===date)return s
      const next={...s,checkedIn:date,drops:s.drops+10};write(next);success=true;return next
    });return success
  },
  buy:id=>{
    let success=false
    const item=DECORATIONS.find(d=>d.id===id)
    if(!item)return false
    set(s=>{
      if(s.owned.includes(id)||s.drops<item.price)return s
      const next={...s,owned:[...s.owned,id],drops:s.drops-item.price};write(next);success=true;return next
    });return success
  },
  equip:(drainId,id)=>set(s=>{
    if(id&&!s.owned.includes(id))return s
    const equipped={...s.equipped}
    if(id) equipped[drainId]=id
    else delete equipped[drainId]
    const next={...s,equipped};write(next);return next
  }),
}))
