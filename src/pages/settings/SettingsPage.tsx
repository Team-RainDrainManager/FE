import { useContext, useEffect, useState, type FormEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { logout, getErrorMessage } from '../../apis/auth'
import { getNotificationSettings, updateNotificationSettings, getPauseStatus, requestPause, type NotificationSettings, type PauseStatus } from '../../apis/profile-settings'
import { withdrawMyAccount } from '../../apis/account'
import { useAuthStore } from '../../store/useAuthStore'
import { clearOnboardingProgress } from '../login/auth-flow'
import { useOnboardingStore } from '../../store/useOnboardingStore'
import { useMyDrainsStore } from '../../store/useMyDrainsStore'
import { queryClient } from '../../apis/query-client'
import { clearDemoAccountData, clearLocalDdorangiData } from '../../utils/firstRun'
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore'
import { requestPushPermission, syncPushTokenIfAllowed, unregisterPushDevice } from '../../services/push-messaging'
import { AccountId } from '../../features/account/AccountId'
import PushOptInCard from '../../features/push/PushOptInCard'

const MODES: {id:ThemeMode; title:string; description:string; symbol:string}[] = [
  {id:'light',title:'라이트',description:'항상 밝은 화면',symbol:'☀'},
  {id:'dark',title:'다크',description:'항상 어두운 화면',symbol:'☾'},
  {id:'sun',title:'일출·일몰',description:'해 뜨면 라이트 · 해 지면 다크',symbol:'◐'},
]
const card = 'dd-settings-card rounded-[22px] border border-[#E5EEF7] bg-white p-5'

export default function SettingsPage({ embedded = false, reportButtonRef }: { embedded?: boolean; reportButtonRef?: RefObject<HTMLButtonElement | null> }) {
  const navigate = useNavigate()
  const accountId = useContext(AccountId)
  const clearAuth = useAuthStore(s => s.clear)
  const clearOnboarding = useOnboardingStore(s => s.clear)
  const clearMyDrains = useMyDrainsStore(s => s.reset)
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null)
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [withdrawWord, setWithdrawWord] = useState('')
  const mode = useThemeStore(s => s.mode)
  const setMode = useThemeStore(s => s.setMode)
  const sun = useThemeStore(s => s.sun)
  const setRegion = useThemeStore(s => s.setLocation)
  const [regionMessage,setRegionMessage] = useState('')
  const [reportOpen,setReportOpen] = useState(false)
  const [reportCategory,setReportCategory] = useState('화면·디자인 오류')
  const [reportText,setReportText] = useState('')
  const [reportDone,setReportDone] = useState(false)
  // Server-backed settings. We never show a guessed default as a saved preference.
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [notificationLoading, setNotificationLoading] = useState(true)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationReload, setNotificationReload] = useState(0)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pauseStatus, setPauseStatus] = useState<PauseStatus | null>(null)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [pauseBusy, setPauseBusy] = useState(false)
  const [pauseError, setPauseError] = useState('')
  const [pauseConfirm, setPauseConfirm] = useState(false)
  const [pauseMessage, setPauseMessage] = useState('')

  useEffect(() => {
    let active = true
    void getNotificationSettings()
      .then(value => { if (active) { setNotificationSettings(value); setNotificationError('') } })
      .catch((error: unknown) => { if (active) setNotificationError(getErrorMessage(error)) })
      .finally(() => { if (active) setNotificationLoading(false) })
    return () => { active = false }
  }, [notificationReload])

  useEffect(() => {
    if (!notificationMessage) return
    const timeoutId = window.setTimeout(() => setNotificationMessage(''), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [notificationMessage])

  async function changeNotificationSetting(key: keyof NotificationSettings) {
    if (!notificationSettings || notificationBusy) return
    setNotificationBusy(true)
    setNotificationError('')
    const enablingPush = key === 'notifications' && !notificationSettings.notifications
    try {
      // 브라우저 알림 권한은 사용자가 스위치나 알림 받기 버튼을 직접 누를 때만 요청합니다.
      let permissionError: unknown = null
      if (enablingPush) {
        try { await requestPushPermission() }
        catch (error: unknown) { permissionError = error }
      }
      // 기기 권한 오류와 서버의 사용자 알림 선호 설정은 서로 독립적으로 처리합니다.
      const next = await updateNotificationSettings({ [key]: !notificationSettings[key] })
      setNotificationSettings(next)
      void queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      setNotificationMessage(key === 'notifications'
        ? (next.notifications ? '활동 알림을 켰습니다.' : '활동 알림을 껐습니다.')
        : (next.nightConsent ? '야간 푸시를 켰습니다.' : '야간 푸시를 껐습니다.'))
      // 알림 설정의 서버 저장이 끝난 뒤 기기 토큰을 동기화합니다.
      if (key === 'notifications') {
        try {
          if (next.notifications) {
            if (permissionError) throw permissionError
            await syncPushTokenIfAllowed()
          } else await unregisterPushDevice()
        } catch (error: unknown) {
          setNotificationError(`설정은 저장됐지만 기기 푸시 연결에 실패했습니다: ${getErrorMessage(error)}`)
        }
      }
    } catch (error: unknown) {
      setNotificationError(getErrorMessage(error))
    } finally {
      setNotificationBusy(false)
    }
  }

  async function openPause() {
    if (pauseOpen) { setPauseOpen(false); setPauseConfirm(false); return }
    setPauseOpen(true)
    setPauseLoading(true)
    setPauseStatus(null)
    setPauseError('')
    try { setPauseStatus(await getPauseStatus()) }
    catch (error: unknown) { setPauseError(getErrorMessage(error)) }
    finally { setPauseLoading(false) }
  }

  async function applyPause() {
    if (!pauseStatus?.canApply || pauseStatus.activeUntil || pauseBusy) return
    setPauseBusy(true)
    setPauseError('')
    setPauseConfirm(false)
    try {
      await requestPause()
      setPauseMessage('점검 쉬기 신청이 완료됐습니다.')
      void queryClient.invalidateQueries({ queryKey: ['my-adoptions'] })

      try {
        if (accountId === null) {
          void queryClient.invalidateQueries({ queryKey: ['pause-status'], refetchType: 'none' })
          setPauseStatus(await getPauseStatus())
        } else {
          const queryKey = ['pause-status', accountId]
          await queryClient.cancelQueries({ queryKey, exact: true })
          setPauseStatus(await queryClient.fetchQuery({
            queryKey,
            queryFn: getPauseStatus,
            staleTime: 0,
          }))
        }
      } catch {
        setPauseStatus(null)
        setPauseError('신청은 완료됐지만 최신 상태를 불러오지 못했습니다. 다시 열어 확인해 주세요.')
      }
    } catch (error: unknown) {
      setPauseError(getErrorMessage(error))
    } finally {
      setPauseBusy(false)
    }
  }

  function prettyDate(iso: string) {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul',
    }).format(date)
  }

  function clearLocalAccountState() {
    clearAuth()
    clearOnboardingProgress()
    clearOnboarding()
    clearMyDrains()
    queryClient.clear()
    clearDemoAccountData()
  }

  async function handleLogout() {
    if (accountBusy) return
    setAccountBusy(true)
    let message = '로그아웃되었습니다.'
    try {
      // 서버 명세: 로그아웃 전에 이 브라우저의 FCM 토큰을 해제합니다.
      try {
        await unregisterPushDevice()
      } catch {
        // 푸시 해제 실패가 로그아웃 자체를 막아서는 안 됩니다.
      }
      await logout()
    } catch (error: unknown) {
      message = `서버 로그아웃 요청 실패: ${getErrorMessage(error)}. 이 기기에서만 로그아웃했습니다.`
    } finally {
      clearLocalAccountState()
      setAccountBusy(false)
      setConfirmAction(null)
      navigate('/login', { replace: true, state: { logoutNotice: message } })
    }
  }

  async function handleWithdraw() {
    if (accountBusy || withdrawWord.trim() !== '탈퇴') return
    setAccountBusy(true)
    setAccountError('')
    try {
      await withdrawMyAccount()
    } catch (error: unknown) {
      // Critical: keep login/session data intact when deletion is not confirmed.
      setAccountError(getErrorMessage(error))
      setAccountBusy(false)
      return
    }
    clearLocalAccountState()
    clearLocalDdorangiData()
    setConfirmAction(null)
    setAccountBusy(false)
    navigate('/login', { replace: true, state: { logoutNotice: '회원 탈퇴가 완료되었습니다.' } })
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

  return <div className={`${embedded ? "dd-settings-page--embedded" : "min-h-[calc(100dvh-128px)]"} dd-settings-page space-y-4 bg-[#F7FAFE] px-[18px] pb-8 pt-5 text-[#24496B]`}>
    <button ref={reportButtonRef} tabIndex={-1} type="button" className="sr-only" aria-label="버그 신고 열기"
      onClick={() => {setReportDone(false);setReportOpen(true)}}>버그 신고 열기</button>
    {notificationMessage && createPortal(
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[350] max-w-[calc(100vw-32px)] -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#18324C] px-5 py-3 text-center text-[13px] font-bold text-white shadow-xl">
        {notificationMessage}
      </div>, document.body
    )}
    {!embedded && <button type="button" className="dd-settings-page__report-standalone" onClick={() => {setReportDone(false);setReportOpen(true)}}>버그 신고하기</button>}
    {!embedded && <div className="px-1">
      <p className="text-[11px] font-extrabold tracking-widest text-[#338CF0]">MY DDORANG</p>
      <h2 className="mt-1 text-xl font-extrabold">설정</h2>
      <p className="mt-1 text-xs text-[#8299B0]">또랑을 내 취향에 맞게 사용해 보세요.</p>
    </div>}
    <section className={card}>
      <h3 className="mb-2 text-[14px] font-extrabold">화면 테마</h3>
      <div className="dd-settings-theme-compact" role="radiogroup" aria-label="화면 테마">
        {MODES.map(option => <button key={option.id} type="button" role="radio"
          aria-checked={mode === option.id} onClick={() => setMode(option.id)}>
          {option.id === 'sun' ? '자동' : option.title}
        </button>)}
      </div>
      {mode === 'sun' && <div className="dd-settings-auto-detail">
        <span>{sun ? `일출 ${sun.sunrise.slice(11,16)} · 일몰 ${sun.sunset.slice(11,16)}` : '일출·일몰에 따라 자동 변경'}</span>
        <button type="button" onClick={selectRegion}>현재 위치 사용</button>
      </div>}
      {mode === 'sun' && regionMessage && <p role="status" className="mt-1 text-[11px]">{regionMessage}</p>}
    </section>
    <div className={`${card} dd-settings-feature-card`}>
      <h3>알림</h3>
      {notificationLoading ? <p role="status" className="dd-settings-feature-desc">설정을 불러오는 중입니다…</p> : notificationSettings ? <>
        <div className="dd-settings-feature-row">
          <div className="dd-settings-feature-text">
            <p className="dd-settings-feature-name">활동 알림</p>
            <small className="dd-settings-feature-desc">점검 일정과 또랑이 돌봄 소식을 받아요.</small>
          </div>
          <button type="button" role="switch" aria-label="활동 알림" aria-checked={notificationSettings.notifications}
            disabled={notificationBusy} className="dd-settings-feature-switch"
            onClick={() => { void changeNotificationSetting('notifications') }}><span aria-hidden="true" /></button>
        </div>
        <div className="dd-settings-feature-row">
          <div className="dd-settings-feature-text">
            <p className="dd-settings-feature-name">야간 푸시 알림</p>
            <small className="dd-settings-feature-desc">밤 10시부터 오전 8시까지 푸시를 받을지 선택해요.</small>
          </div>
          <button type="button" role="switch" aria-label="야간 푸시 알림" aria-checked={notificationSettings.nightConsent}
            disabled={notificationBusy} className="dd-settings-feature-switch"
            onClick={() => { void changeNotificationSetting('nightConsent') }}><span aria-hidden="true" /></button>
        </div>
        {/* 서버 설정이 켜져 있어도 이 기기가 허용하지 않았으면 푸시가 오지 않으므로 따로 안내합니다. */}
        <PushOptInCard className="mt-3" onEnabled={() => setNotificationReload(value => value + 1)} />
      </> : null}
      {notificationError && <div role="alert" className="mt-3 text-xs text-[#C65A62]">
        {notificationError}
        {!notificationSettings && <button type="button" className="ml-2 underline" onClick={() => { setNotificationLoading(true); setNotificationReload(value => value + 1) }}>다시 시도</button>}
      </div>}
    </div>
    <div className={`${card} dd-settings-feature-card`}>
      <h3>돌봄 관리</h3>
      <button type="button" className="dd-settings-pause-row" aria-expanded={pauseOpen} onClick={() => { void openPause() }}>
        <span className="dd-settings-feature-text">
          <span className="dd-settings-feature-name">점검 쉬기</span>
          <small className="dd-settings-feature-desc">14일간 정기 점검을 쉬는 기능이에요.</small>
        </span>
        <span className="dd-settings-pause-arrow" aria-hidden="true">{pauseOpen ? '⌄' : '›'}</span>
      </button>
      {pauseOpen && <div className="dd-settings-pause-preview">
        {pauseLoading ? <p role="status">쉬기 상태를 확인하는 중입니다…</p> : <>
          {pauseError && <p role="alert" className="text-[#C65A62]">{pauseError}</p>}
          {pauseMessage && <p role="status">{pauseMessage}</p>}
          {pauseStatus && <>
            {pauseStatus.activeUntil ? <p>{prettyDate(pauseStatus.activeUntil)}까지 정기 점검을 쉬고 있습니다.</p>
              : pauseStatus.canApply ? <p>신청하면 14일 동안 정기 점검과 자동 입양 해제가 보류됩니다. 취소·연장은 할 수 없고, 90일에 한 번 신청할 수 있습니다. 비 예보 점검 요청은 계속 받습니다.</p>
              : <p>{pauseStatus.reason === 'NO_ADOPTION' ? '입양한 빗물받이가 있어야 신청할 수 있습니다.' : '현재 점검 쉬기를 신청할 수 없습니다.'}</p>}
            {!pauseStatus.canApply && pauseStatus.nextAvailableAt && <p>다음 신청 가능일: {prettyDate(pauseStatus.nextAvailableAt)}</p>}
            {pauseStatus.canApply && !pauseStatus.activeUntil && !pauseConfirm &&
              <button type="button" disabled={pauseBusy} onClick={() => setPauseConfirm(true)}>점검 쉬기 신청</button>}
            {pauseConfirm && <div className="mt-3 space-y-2" role="group" aria-label="점검 쉬기 신청 확인">
              <p>14일 쉬기를 신청하시겠습니까? 신청 후 취소할 수 없습니다.</p>
              <div className="flex gap-2">
                <button type="button" disabled={pauseBusy} onClick={() => setPauseConfirm(false)}>취소</button>
                <button type="button" disabled={pauseBusy} onClick={() => { void applyPause() }}>{pauseBusy ? '신청 중…' : '신청 확정'}</button>
              </div>
            </div>}
          </>}
        </>}
      </div>}
    </div>
    <div className="dd-settings-account-actions">
      <button type="button" disabled={accountBusy} onClick={() => {setAccountError('');setConfirmAction('logout')}}>로그아웃</button>
      <button type="button" disabled={accountBusy} onClick={() => {setAccountError('');setWithdrawWord('');setConfirmAction('delete')}}>회원 탈퇴</button>
    </div>
    <p className="text-center text-[11px] text-[#8299B0]">또랑 · 우리 동네 빗물받이 돌봄 서비스</p>
    {confirmAction && createPortal(
      <div className="dd-settings-account-backdrop" onMouseDown={event => {
        if (event.target === event.currentTarget && !accountBusy) setConfirmAction(null)
      }}>
        <section className="dd-settings-account-dialog" role="alertdialog" aria-modal="true"
          aria-labelledby="dd-settings-account-title" aria-describedby="dd-settings-account-description">
          <h3 id="dd-settings-account-title">{confirmAction === 'logout' ? '로그아웃하시겠습니까?' : '정말 회원 탈퇴하시겠습니까?'}</h3>
          <p id="dd-settings-account-description">{confirmAction === 'logout'
            ? '현재 기기의 로그인 정보가 삭제됩니다.'
            : '회원 탈퇴 후에는 계정을 복구할 수 없을 수 있습니다. 아래에 ‘탈퇴’를 입력해야 요청을 보낼 수 있습니다.'}</p>
          {confirmAction === 'delete' && <label htmlFor="settings-withdraw-word">확인을 위해 탈퇴 입력
            <input id="settings-withdraw-word" autoComplete="off" value={withdrawWord}
              disabled={accountBusy} onChange={event => setWithdrawWord(event.target.value)} placeholder="탈퇴" />
          </label>}
          {accountError && <p role="alert">{accountError}</p>}
          <div className="dd-settings-account-dialog__buttons">
            <button type="button" disabled={accountBusy} onClick={() => setConfirmAction(null)}>취소</button>
            <button type="button" disabled={accountBusy || (confirmAction === 'delete' && withdrawWord.trim() !== '탈퇴')}
              onClick={() => {if(confirmAction === 'logout') void handleLogout(); else void handleWithdraw()}}>
              {accountBusy ? '처리 중…' : confirmAction === 'logout' ? '로그아웃' : '회원 탈퇴 확인'}
            </button>
          </div>
        </section>
      </div>, document.body
    )}
    {reportOpen && createPortal(<div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4" onClick={e=>{if(e.target===e.currentTarget)setReportOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="bug-report-title" className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        {reportDone ? <div className="py-5 text-center"><p className="text-3xl">✓</p><h3 id="bug-report-title" className="mt-3 text-lg font-bold">신고 내용을 작성했습니다</h3><p className="mt-2 text-sm leading-6 text-[#8299B0]">신고 화면 시연이 완료되었습니다. 실제 서버로 전송되지는 않았습니다.</p><button onClick={()=>{setReportOpen(false);setReportText('')}} className="mt-5 min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">닫기</button></div>:
        <form onSubmit={submitReport} className="space-y-3"><div className="flex items-center justify-between"><h3 id="bug-report-title" className="text-lg font-extrabold">버그 신고</h3><button type="button" aria-label="닫기" onClick={()=>setReportOpen(false)}>✕</button></div><label className="block text-xs font-bold" htmlFor="report-category">오류 종류</label><select id="report-category" className="min-h-11 w-full rounded-xl border border-[#E5EEF7] bg-white px-3 text-sm" value={reportCategory} onChange={e=>setReportCategory(e.target.value)}><option>화면·디자인 오류</option><option>로그인 오류</option><option>빗물받이·지도 오류</option><option>기타</option></select><label htmlFor="report-description" className="block text-xs font-bold">어떤 문제가 있었나요?</label><textarea id="report-description" rows={5} minLength={5} maxLength={1000} required value={reportText} onChange={e=>setReportText(e.target.value)} placeholder="문제가 발생한 화면과 상황을 알려주세요." className="w-full rounded-xl border border-[#E5EEF7] p-3 text-sm"/><p className="text-[11px] text-[#8299B0]">시연용입니다. 실제 운영 신고는 아직 지원하지 않습니다.</p><button type="submit" className="min-h-11 w-full rounded-xl bg-[#3981F7] text-sm font-bold text-white">작성 완료 (시연)</button></form>}
      </section>
    </div>, document.body)}
  </div>
}
