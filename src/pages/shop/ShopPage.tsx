import { useState } from 'react'
import { Link } from 'react-router'
import { DECORATIONS, useDecorationStore } from '../../store/useDecorationStore'

export default function ShopPage(){
  const drops=useDecorationStore(s=>s.drops)
  const owned=useDecorationStore(s=>s.owned)
  const checkedIn=useDecorationStore(s=>s.checkedIn)
  const checkIn=useDecorationStore(s=>s.checkIn)
  const buy=useDecorationStore(s=>s.buy)
  const [message,setMessage]=useState('')
  const today=new Date().toLocaleDateString('sv-SE')
  return <div className="min-h-[calc(100dvh-128px)] space-y-4 bg-[#F7FAFE] px-[18px] pb-8 pt-5 text-[#24496B]">
    <section className="rounded-3xl bg-gradient-to-br from-[#D7EFFF] to-[#EDF8FF] p-5">
      <p className="text-xs font-bold text-[#367AC0]">또랑 꾸미기 상점</p><h2 className="mt-1 text-xl font-extrabold">빗물로 꾸미는 나만의 또랑이</h2>
      <p className="mt-3 text-3xl font-black text-[#247DC7]">💧 {drops}<span className="ml-1 text-sm">빗물</span></p>
      <p className="mt-2 text-xs text-[#6084A0]">체험용 재화입니다. 서버에 저장되거나 실제 보상과 연동되지는 않습니다.</p>
      <button disabled={checkedIn===today} onClick={()=>setMessage(checkIn()?'체험용 빗물 10개를 받았습니다.':'오늘은 이미 받았습니다.')} className="mt-4 min-h-11 w-full rounded-xl bg-[#3981F7] px-3 text-sm font-bold text-white disabled:bg-[#A4BBD2]">{checkedIn===today?'오늘 체험 보상 받음':'오늘의 돌봄 응원 +10 💧'}</button>
    </section>
    <section className="rounded-3xl border border-[#E5EEF7] bg-white p-4"><h3 className="text-base font-bold">꾸미기 아이템</h3><p className="mt-1 text-xs text-[#8299B0]">아이템을 구매한 뒤 또랑이 카드에서 장착할 수 있어요.</p><div className="mt-4 grid grid-cols-2 gap-3">
      {DECORATIONS.map(item=><div key={item.id} className="rounded-2xl border border-[#E5EEF7] bg-[#F9FCFF] p-3 text-center"><div className="py-3 text-4xl" aria-hidden="true">{item.symbol}</div><strong className="block text-sm">{item.name}</strong><p className="mt-1 text-xs text-[#7D91A7]">💧 {item.price}</p><button type="button" disabled={owned.includes(item.id)||drops<item.price} onClick={()=>setMessage(buy(item.id)?`${item.name}을(를) 구매했습니다.`:'빗물이 부족합니다.')} className="mt-3 min-h-10 w-full rounded-xl bg-[#E8F2FF] text-xs font-bold text-[#337AC0] disabled:opacity-50">{owned.includes(item.id)?'보유 중': '구매하기'}</button></div>)}
    </div></section>
    {message&&<p role="status" className="rounded-xl bg-[#EAF4FF] p-3 text-xs">{message}</p>}
    <Link to="/my-drains" className="block rounded-xl bg-[#EFF6FF] p-3 text-center text-sm font-bold text-[#337AC0]">내 또랑이 꾸미러 가기 ›</Link>
  </div>
}
