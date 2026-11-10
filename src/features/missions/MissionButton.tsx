import { useEffect, useState } from 'react'
import Sheet from '../../components/common/Sheet'
import { drops, missions, today, useWallet } from './wallet'

export default function MissionButton() {
  const [open, setOpen] = useState(false)
  const [weekly, setWeekly] = useState(false)
  const [date, setDate] = useState(today)
  const wallet = useWallet()
  useEffect(() => {
    let timer: number
    const refresh = () => {
      setDate(today())
      clearTimeout(timer)
      const day = 86400000
      timer = window.setTimeout(refresh, day - (Date.now() + 9 * 3600000) % day)
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return <>
    <button type="button" className="dd-mission-trigger" aria-label="미션 열기" onClick={() => { setWeekly(false); setOpen(true) }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="15" height="18" rx="3"/><path d="M3.5 7H7m-3.5 5H7m-3.5 5H7m3-7 1.5 1.5 3.5-4M11 16h5"/></svg><small>미션</small>
    </button>
    {open && <Sheet title="미션" onClose={() => setOpen(false)}>
      <div className="rd-social-segment" aria-label="미션 종류">{['일일 미션','주간 미션'].map((tab, i) => <button key={tab} type="button" aria-pressed={weekly === !!i} className={weekly === !!i ? 'is-active' : ''} onClick={() => setWeekly(!!i)}>{tab}</button>)}</div>
      {weekly ? <p className="dd21-sanctions-empty">등록된 주간 미션이 없어요.</p> : <ul className="dd-missions">
        {missions.map(m => {
          const done = wallet.day === date && wallet.done.includes(m.id)
          return <li key={m.id}><strong>{m.title}</strong><small>보상 : {drops(m.reward)}</small><b aria-label={done ? '완료' : '미완료'} data-done={done}>{done ? '✓' : '×'}</b></li>
        })}
      </ul>}
    </Sheet>}
  </>
}
