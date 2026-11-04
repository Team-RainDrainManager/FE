import { useState, type FormEvent } from 'react'
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore'
import { DEFAULT_REGION } from '../../utils/sky'

const MODES: {id:ThemeMode; title:string; description:string; symbol:string}[] = [
  {id:'light',title:'라이트',description:'항상 밝은 화면',symbol:'☀'},
  {id:'dark',title:'다크',description:'항상 어두운 화면',symbol:'☾'},
  {id:'sun',title:'일출·일몰',description:'해 뜨면 라이트 · 해 지면 다크',symbol:'◐'},
]
const card = 'dd-settings-card rounded-[22px] border border-[#E5EEF7] bg-white p-5'

export default function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  const mode = useThemeStore(s => s.mode)
  const setMode = useThemeStore(s => s.setMode)
  const sun = useThemeStore(s => s.sun)
  const region = useThemeStore(s => s.location)
  const setRegion = useThemeStore(s => s.setLocation)
  const [regionMessage,setRegionMessage] = useState('')
  const [reportOpen,setReportOpen] = useState(false)
  const [reportCategory,setReportCategory] = useState('화면·디자인 오류')
  const [reportText,setReportText] = useState('')
  const [reportDone,setReportDone] = useState(false)
  // UI-only preview. Server notification and inspection-pause APIs are not connected.
  const [notificationsPreview, setNotificationsPreview] = useState(false)
  const [pausePreviewOpen, setPausePreviewOpen] = useState(false)
  const [pausePreviewActive, setPausePreviewActive] = useState(false)

  function selectRegion() {
    if (!navigator.geolocation) {setRegionMessage('이 브라우저에서는 위치 확인을 지원하지 않습니다.');return}
    setRegionMessage('현재 위치를 확인하는 중입니다…')
    navigator.geolocation.getCurrentPosition(
      position => { setRegion(position.coords.latitude,position.coords.longitude); setRegionMessage('현재 위치 기준으로 일출·일몰 시간을 갱신합니다.') },
      () => setRegionMessage('위치 권한이 없어 시범 지역 기준을 유지합니다.'),
      {timeout:10000,enableHighAccuracy:false,maximumAge:3600000},
    )
  }

  function submitReport(e:FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (reportText.trim().length < 5) return
    // 서버 신고 엔드포인트가 없는 UI 시연: 실제 제출을 암시하지 않습니다.
    setReportDone(true)
  }

  return <div className={`${embedded ? "dd-settings-page--embedded" : "min-h-[calc(100dvh-128px)]"} dd-settings-page space-y-4 bg-[#F7FAFE] px-[18px] pb-8 pt-5 text-[#24496B]`}>
    <div className="px-1">
      <p className="text-[11px] font-extrabold tracking-widest text-[#338CF0]">MY DDORANG</p>
      <h2 className="mt-1 text-xl font-extrabold">설정</h2>
      <p className="mt-1 text-xs text-[#8299B0]">또랑을 내 취향에 맞게 사용해 보세요.</p>
    </div>
    <section className={card}>
      <h3 className="text-[15px] font-extrabold">화면 테마</h3>
      <p className="mt-1 text-xs text-[#8299B0]">일출·일몰 선택 시 실제 해 뜨고 지는 시간에 맞춰 자동 전환됩니다.</p>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="화면 테마">
        {MODES.map(option => <button key={option.id} role="radio" aria-checked={mode===option.id} type="button" onClick={()=>setMode(option.id)} className={`dd-settings-option flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${mode===option.id?'border-[#3981F7] bg-[#EAF4FF]':'border-[#E5EEF7] bg-white'}`}>
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F6FB] text-lg text-[#338CF0]">{option.symbol}</span>
          <span className="flex-1"><strong className="block text-sm">{option.title}</strong><small className="mt-1 block text-[11px] text-[#8299B0]">{option.description}</small></span>
          <span aria-hidden="true" className={`h-4 w-4 rounded-full border-[5px] ${mode===option.id?'border-[#3981F7]':'border-[#CAD6E4]'}`}/>
        </button>)}
      </div>
      {mode==='sun' && <div className="mt-4 rounded-xl bg-[#F2F8FF] p-3">
        <p className="text-xs font-bold">{sun ? `오늘 일출 ${sun.sunrise.slice(11,16)} · 일몰 ${sun.sunset.slice(11,16)}`:'일출·일몰 확인 중 / 연결 불가 시 06~18시 기준'}</p>
        <p className="mt-1 text-[11px] text-[#8299B0]">{region.latitude===DEFAULT_REGION.latitude&&region.longitude===DEFAULT_REGION.longitude?'역곡 인근 시범 지역 기준':'선택한 위치 기준'} · 위치 정보는 브라우저에만 보관됩니다.</p>
        <button type="button" onClick={selectRegion} className="mt-2 rounded-lg bg-[#E1EDFB] px-3 py-2 text-xs font-bold text-[#3976B5]">현재 위치 사용</button>
        {regionMessage && <p role="status" className="mt-2 text-[11px]">{regionMessage}</p>}
      </div>}
    </section>
    <div className={`${card} dd-settings-feature-card`}>
      <h3>알림</h3>
      <div className="dd-settings-feature-row">
        <div className="dd-settings-feature-text">
          <p className="dd-settings-feature-name">알림 받기</p>
          <small className="dd-settings-feature-desc">점검 일정과 또랑이 돌봄 소식을 받아요.</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="알림 받기 (시연)"
          aria-checked={notificationsPreview}
          className="dd-settings-feature-switch"
          onClick={() => setNotificationsPreview(value => !value)}
        ><span aria-hidden="true" /></button>
      </div>
      <p className="dd-settings-feature-note">현재 UI 시연용이며 실제 알림 설정에는 반영되지 않습니다.</p>
    </div>
    <div className={`${card} dd-settings-feature-card`}>
      <h3>돌봄 관리</h3>
      <button
        type="button"
        className="dd-settings-pause-row"
        aria-expanded={pausePreviewOpen}
        onClick={() => setPausePreviewOpen(value => !value)}
      >
        <span className="dd-settings-feature-text">
          <span className="dd-settings-feature-name">점검 쉬기</span>
          <small className="dd-settings-feature-desc">14일간 정기 점검을 쉬는 기능이에요.</small>
        </span>
        <span className="dd-settings-pause-arrow" aria-hidden="true">{pausePreviewOpen ? '⌄' : '›'}</span>
      </button>
      {pausePreviewOpen && <div className="dd-settings-pause-preview">
        <p>시연용 설정입니다. 실제 점검 일정이나 서버 상태는 바뀌지 않습니다.</p>
        <button type="button" onClick={() => setPausePreviewActive(value => !value)}>
          {pausePreviewActive ? '시연 상태 해제' : '14일 쉬기 미리보기'}
        </button>
        {pausePreviewActive && <p role="status" className="mt-2">점검 쉬기 화면 시연 중입니다.</p>}
      </div>}
    </div>
    <section className={card}>
      <h3 className="text-[15px] font-extrabold">도움말</h3>
      <button type="button" onClick={()=>{setReportOpen(true);setReportDone(false)}} className="mt-4 flex min-h-12 w-full items-center justify-between text-left text-sm font-bold"><span>버그 신고하기</span><span className="text-[#338CF0]">›</span></button>
      <p className="mt-1 text-[11px] leading-5 text-[#8299B0]">현재는 신고 화면 시연용이며 서버로 전송되지는 않습니다.</p>
    </section>
    <p className="text-center text-[11px] text-[#8299B0]">또랑 · 우리 동네 빗물받이 돌봄 서비스</p>
    {reportOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={e=>{if(e.target===e.currentTarget)setReportOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="bug-report-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        {reportDone ? <div className="py-5 text-center"><p className="text-3xl">✓</p><h3 id="bug-report-title" className="mt-3 text-lg font-bold">신고 내용을 작성했습니다</h3><p className="mt-2 text-sm leading-6 text-[#8299B0]">신고 화면 시연이 완료되었습니다. 실제 서버로 전송되지는 않았습니다.</p><button onClick={()=>{setReportOpen(false);setReportText('')}} className="mt-5 min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">닫기</button></div>:
        <form onSubmit={submitReport} className="space-y-3"><div className="flex items-center justify-between"><h3 id="bug-report-title" className="text-lg font-extrabold">버그 신고</h3><button type="button" aria-label="닫기" onClick={()=>setReportOpen(false)}>✕</button></div><label className="block text-xs font-bold" htmlFor="report-category">오류 종류</label><select id="report-category" className="min-h-11 w-full rounded-xl border border-[#E5EEF7] bg-white px-3 text-sm" value={reportCategory} onChange={e=>setReportCategory(e.target.value)}><option>화면·디자인 오류</option><option>로그인 오류</option><option>빗물받이·지도 오류</option><option>기타</option></select><label htmlFor="report-description" className="block text-xs font-bold">어떤 문제가 있었나요?</label><textarea id="report-description" rows={5} minLength={5} maxLength={1000} required value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="문제가 발생한 화면과 상황을 알려주세요." className="w-full rounded-xl border border-[#E5EEF7] p-3 text-sm"/><p className="text-[11px] text-[#8299B0]">시연용입니다. 실제 운영 신고는 아직 지원하지 않습니다.</p><button type="submit" className="min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">작성 완료 (시연)</button></form>}
      </section>
    </div>}
  </div>
}
