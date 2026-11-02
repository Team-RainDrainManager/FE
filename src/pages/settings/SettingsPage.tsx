import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { changeNickname, getErrorMessage, getMe, logout } from '../../apis/auth'
import { useAuthStore } from '../../store/useAuthStore'
import { clearOnboardingProgress } from '../login/auth-flow'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import { queryClient } from '../../apis/query-client'
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore'
import { DEFAULT_REGION } from '../../utils/sky'
import Character from '../../components/common/Character'
import { clearDemoAccountData, clearLocalDdorangiData } from '../../utils/firstRun'
import { useDecorationStore } from '../../store/useDecorationStore'

const MODES: {id:ThemeMode; title:string; description:string; symbol:string}[] = [
  {id:'light',title:'라이트',description:'항상 밝은 화면',symbol:'☀'},
  {id:'dark',title:'다크',description:'항상 어두운 화면',symbol:'☾'},
  {id:'sun',title:'일출·일몰',description:'해 뜨면 라이트 · 해 지면 다크',symbol:'◐'},
]
const card = 'dd-settings-card rounded-[22px] border border-[#E5EEF7] bg-white p-5'

export default function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore(s => s.clear)
  const clearOnboarding = useOnboardingStore(s => s.clear)
  const clearMyDrains = useMyDrainsStore(s => s.reset)
  const mode = useThemeStore(s => s.mode)
  const setMode = useThemeStore(s => s.setMode)
  const sun = useThemeStore(s => s.sun)
  const region = useThemeStore(s => s.location)
  const setRegion = useThemeStore(s => s.setLocation)
  const [regionMessage,setRegionMessage] = useState('')
  const [loggingOut,setLoggingOut] = useState(false)
  const [confirmAction,setConfirmAction] = useState<'logout'|'delete'|null>(null)
  const [nickname,setNickname] = useState('')
  const [nicknameDraft,setNicknameDraft] = useState('')
  const [nicknameOpen,setNicknameOpen] = useState(false)
  const [nicknameSaving,setNicknameSaving] = useState(false)
  const [accountMessage,setAccountMessage] = useState('')
  const [reportOpen,setReportOpen] = useState(false)
  const [reportCategory,setReportCategory] = useState('화면·디자인 오류')
  const [reportText,setReportText] = useState('')
  const [reportDone,setReportDone] = useState(false)

  useEffect(() => {
    let active = true
    getMe().then(me => {
      if (active) { setNickname(me.nickname);setNicknameDraft(me.nickname) }
    }).catch(() => { if (active) setAccountMessage('닉네임은 로그인 후 확인할 수 있습니다.') })
    return () => {active=false}
  }, [])

  async function saveNickname(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = nicknameDraft.trim()
    if (value.length < 2 || value.length > 20) { setAccountMessage('닉네임은 2~20자로 입력해 주세요.');return }
    setNicknameSaving(true);setAccountMessage('')
    try {
      await changeNickname(value)
      setNickname(value);setNicknameOpen(false)
      try {localStorage.setItem('ddorang:demo-profile-name',value)} catch { /* ignore */ }
      setAccountMessage('닉네임을 저장했습니다.')
    } catch(error:unknown) {setAccountMessage(getErrorMessage(error))}
    finally {setNicknameSaving(false)}
  }

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

  async function handleLogout() {
    setLoggingOut(true)
    let logoutNotice = ''
    try { await logout() }
    catch(error:unknown) {logoutNotice = `${getErrorMessage(error)} 이 기기의 로그인 정보만 삭제했습니다.`}
    finally {
      clearAuth();clearOnboardingProgress();clearOnboarding();clearMyDrains();queryClient.clear()
      clearDemoAccountData()
      useDecorationStore.getState().reset()
      setLoggingOut(false)
      navigate('/login', {replace:true,state:logoutNotice?{logoutNotice}:null})
    }
  }

  function deleteLocalDemoData() {
    // 실제 회원 탈퇴 API가 확인되지 않아 서버 계정 삭제를 호출하지 않습니다.
    // 아래 동작은 브라우저에 남은 시연 기록만 삭제합니다.
    clearLocalDdorangiData()
    clearAuth(); clearOnboarding(); clearMyDrains(); queryClient.clear()
    useDecorationStore.getState().reset()
    setConfirmAction(null)
    navigate('/login', {replace: true, state: {logoutNotice:'이 기기의 시연 데이터만 삭제했습니다. 서버 계정은 탈퇴되지 않았습니다.'}})
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
    <section className={card}>
      <h3 className="text-[15px] font-extrabold">계정 및 프로필</h3>
      <div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">닉네임 변경</p><p className="mt-1 text-xs text-[#8299B0]">{nickname||'계정 정보 불러오는 중'}</p></div><button type="button" className="rounded-xl bg-[#EFF6FF] px-3 py-2 text-xs font-bold text-[#367AC0]" onClick={()=>{setNicknameOpen(!nicknameOpen);setNicknameDraft(nickname)}}>수정</button></div>
      {nicknameOpen && <form onSubmit={e=>{void saveNickname(e)}} className="mt-3 space-y-2"><label htmlFor="settings-nickname" className="text-xs">새 닉네임 (2~20자)</label><input id="settings-nickname" className="min-h-11 w-full rounded-xl border border-[#CEDDEB] px-3 text-sm" maxLength={20} value={nicknameDraft} onChange={e=>setNicknameDraft(e.target.value)}/><button type="submit" disabled={nicknameSaving} className="min-h-10 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white disabled:opacity-60">{nicknameSaving?'저장 중…':'닉네임 저장'}</button></form>}
      <Link to="/profile" className="mt-4 flex min-h-11 items-center justify-between border-t border-[#E5EEF7] text-sm font-semibold"><span>프로필 사진 변경</span><span className="text-[#338CF0]">이동 ›</span></Link>
      {accountMessage && <p role="status" className="mt-2 text-xs text-[#6387A8]">{accountMessage}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={loggingOut} onClick={()=>setConfirmAction('logout')} className="min-h-11 rounded-xl bg-[#EFF6FF] text-[13px] font-bold text-[#367AC0] disabled:opacity-60">로그아웃</button>
        <button type="button" onClick={()=>setConfirmAction('delete')} className="min-h-11 rounded-xl border border-[#F4D6DA] bg-[#FFF6F6] text-[13px] font-bold text-[#A83D4C]">회원 탈퇴</button>
      </div>
    </section>
    <section className={card}>
      <h3 className="text-[15px] font-extrabold">도움말</h3>
      <button type="button" onClick={()=>{setReportOpen(true);setReportDone(false)}} className="mt-4 flex min-h-12 w-full items-center justify-between text-left text-sm font-bold"><span>버그 신고하기</span><span className="text-[#338CF0]">›</span></button>
      <p className="mt-1 text-[11px] leading-5 text-[#8299B0]">현재는 신고 화면 시연용이며 서버로 전송되지는 않습니다.</p>
    </section>
    <p className="text-center text-[11px] text-[#8299B0]">또랑 · 우리 동네 빗물받이 돌봄 서비스</p>
    {confirmAction && <div className="dd-account-confirm-backdrop" onMouseDown={event=>{ if(event.target === event.currentTarget && !loggingOut) setConfirmAction(null)}}>
      <section className="dd-account-confirm" role="alertdialog" aria-modal="true" aria-labelledby="dd-account-confirm-title" aria-describedby="dd-account-confirm-description">
        <div className="dd-account-cry"><Character type="state" state="crying" size={144}/></div>
        <h3 id="dd-account-confirm-title">{confirmAction === 'logout' ? '정말로 로그아웃 하실 건가요?' : '정말로 회원 탈퇴 하실 건가요?'}</h3>
        <p id="dd-account-confirm-description">{confirmAction === 'logout' ? '또랑이가 아쉬워하고 있어요. 언제든 다시 만날 수 있어요.' : '현재 삭제 API가 연결되지 않았어요. 지금은 이 기기의 시연 데이터만 삭제할 수 있고 서버 회원정보는 삭제되지 않습니다.'}</p>
        <div className="dd-account-confirm-actions">
          <button type="button" disabled={loggingOut} onClick={()=>setConfirmAction(null)}>취소</button>
          <button type="button" disabled={loggingOut} onClick={()=>{if(confirmAction === 'logout'){void handleLogout()}else deleteLocalDemoData()}} className="danger">{loggingOut ? '처리 중…' : confirmAction === 'logout' ? '로그아웃 확인' : '시연 데이터만 삭제'}</button>
        </div>
      </section>
    </div>}
    {reportOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={e=>{if(e.target===e.currentTarget)setReportOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="bug-report-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        {reportDone ? <div className="py-5 text-center"><p className="text-3xl">✓</p><h3 id="bug-report-title" className="mt-3 text-lg font-bold">신고 내용을 작성했습니다</h3><p className="mt-2 text-sm leading-6 text-[#8299B0]">신고 화면 시연이 완료되었습니다. 실제 서버로 전송되지는 않았습니다.</p><button onClick={()=>{setReportOpen(false);setReportText('')}} className="mt-5 min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">닫기</button></div>:
        <form onSubmit={submitReport} className="space-y-3"><div className="flex items-center justify-between"><h3 id="bug-report-title" className="text-lg font-extrabold">버그 신고</h3><button type="button" aria-label="닫기" onClick={()=>setReportOpen(false)}>✕</button></div><label className="block text-xs font-bold" htmlFor="report-category">오류 종류</label><select id="report-category" className="min-h-11 w-full rounded-xl border border-[#E5EEF7] bg-white px-3 text-sm" value={reportCategory} onChange={e=>setReportCategory(e.target.value)}><option>화면·디자인 오류</option><option>로그인 오류</option><option>빗물받이·지도 오류</option><option>기타</option></select><label htmlFor="report-description" className="block text-xs font-bold">어떤 문제가 있었나요?</label><textarea id="report-description" rows={5} minLength={5} maxLength={1000} required value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="문제가 발생한 화면과 상황을 알려주세요." className="w-full rounded-xl border border-[#E5EEF7] p-3 text-sm"/><p className="text-[11px] text-[#8299B0]">시연용입니다. 실제 운영 신고는 아직 지원하지 않습니다.</p><button type="submit" className="min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">작성 완료 (시연)</button></form>}
      </section>
    </div>}
  </div>
}
