import Character from './common/Character'
export default function LevelUpCelebration({level,onClose}:{level:number;onClose:()=>void}){
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F2845]/75 p-5" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="level-up-title" onClick={e=>e.stopPropagation()} className="w-full max-w-sm rounded-[32px] bg-white px-5 py-8 text-center shadow-2xl">
      <p className="text-[12px] font-extrabold tracking-widest text-[#3981F7]">LEVEL UP!</p><h2 id="level-up-title" className="mt-2 text-2xl font-extrabold text-[#203451]">Lv.{level} 달성!</h2>
      <div className="dd-level-joy mx-auto mt-6 flex h-[210px] items-center justify-center"><Character type="state" state="joy" size={185}/></div>
      <p className="mt-1 text-sm font-semibold text-[#6986A2]">또랑이가 기뻐서 폴짝폴짝 뛰고 있어요!</p>
      {level>=10 && <p className="mt-2 text-xs text-[#338CF0]">이제 또랑이에게 특별한 이름을 지어줄 수 있어요.</p>}
      <button onClick={onClose} className="mt-6 min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">축하하기</button>
    </section>
  </div>
}
