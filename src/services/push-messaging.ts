import { deletePushToken, registerPushToken } from '../apis/push-tokens'
import { getNotificationSettings, updateNotificationSettings } from '../apis/profile-settings'
import { useAuthStore } from '../store/useAuthStore'

// 토큰은 서버에 전달하는 기기 식별값입니다. 브라우저 저장소·로그에 출력하지 않습니다.
let currentToken: string | null = null
let syncedForAccessToken: string | null = null
let registerInFlight: Promise<void> | null = null

function requirePushEnvironment(): string {
  if (typeof window === 'undefined' || !window.isSecureContext ||
    !('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('이 브라우저에서는 웹 푸시를 사용할 수 없습니다. HTTPS 또는 localhost가 필요합니다.')
  }
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
  if (!vapidKey?.trim()) {
    throw new Error('Firebase 웹 푸시 공개키(VITE_FIREBASE_VAPID_KEY)가 설정되지 않았습니다.')
  }
  return vapidKey
}

/**
 * 이 기기에서 푸시를 받을 수 있는 상태입니다.
 * - ask: 아직 묻지 않음 (버튼을 누르면 브라우저가 권한을 묻습니다)
 * - granted: 허용됨
 * - blocked: 사용자가 차단함 (브라우저 설정에서만 되돌릴 수 있습니다)
 * - ios-install: 아이폰·아이패드는 홈 화면에 추가한 앱에서만 웹 푸시를 받습니다
 * - in-app: 카카오톡 등 앱 안 브라우저라 알림 기능이 없습니다
 * - unsupported: 브라우저가 지원하지 않거나 푸시 설정값이 없습니다
 */
export type PushDeviceState = 'ask' | 'granted' | 'blocked' | 'ios-install' | 'in-app' | 'unsupported'

// 앱 안에서 링크를 열 때 쓰는 브라우저의 표시 이름입니다. (카카오톡, 네이버, 인스타그램, 페이스북, 라인, 다음, 에브리타임)
const IN_APP_BROWSERS = ['KAKAOTALK', 'NAVER(inapp', 'Instagram', 'FBAN', 'FBAV', 'Line/', 'DaumApps', 'everytimeApp']

export function detectPushDevice(): PushDeviceState {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'unsupported'
  const agent = navigator.userAgent || ''
  const isIOS = /iPhone|iPad|iPod/i.test(agent) ||
    (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const hasPush = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  if (!hasPush) {
    if (IN_APP_BROWSERS.some((name) => agent.includes(name))) return 'in-app'
    if (isIOS && !standalone) return 'ios-install'
    return 'unsupported'
  }
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
  if (!vapidKey?.trim()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'blocked'
  return 'ask'
}

/**
 * '알림 받기' 버튼에서 호출합니다. 브라우저 권한을 묻고, 서버 알림 설정을 켜고, 이 기기를 등록합니다.
 * 반드시 사용자가 버튼을 누른 순간에 호출해야 합니다. (자동 권한 팝업 금지)
 */
export async function enablePushOnThisDevice(): Promise<void> {
  await requestPushPermission()
  const settings = await getNotificationSettings()
  if (!settings.notifications) await updateNotificationSettings({ notifications: true })
  syncedForAccessToken = null
  await syncPushTokenIfAllowed()
}

/** 사용자 조작(알림 스위치·알림 받기 버튼)에서만 호출하세요. 자동 권한 팝업은 금지합니다. */
export async function requestPushPermission(): Promise<void> {
  requirePushEnvironment()
  const permission = Notification.permission === 'granted'
    ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 허용되지 않았습니다. 브라우저 사이트 설정에서 허용해 주세요.')
  }
}

/** 권한 허용 후 앱 시작/로그인 또는 스위치 활성화 시 서버와 동기화합니다. */
export async function syncPushTokenIfAllowed(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) ||
    Notification.permission !== 'granted' || !useAuthStore.getState().accessToken) return
  if (registerInFlight) return registerInFlight
  const accessToken = useAuthStore.getState().accessToken
  if (syncedForAccessToken === accessToken) return

  const task = (async () => {
    const { notifications } = await getNotificationSettings()
    if (!notifications) return
    const vapidKey = requirePushEnvironment()
    const { isSupported, getMessaging, getToken } = await import('firebase/messaging')
    if (!await isSupported()) throw new Error('이 브라우저는 Firebase 웹 푸시를 지원하지 않습니다.')
    const { firebaseApp } = await import('../config/firebase')
    const existing = await navigator.serviceWorker.getRegistrations()
    const root = new URL('/', window.location.href).href
    const conflict = existing.find(reg => reg.scope === root &&
      [reg.active, reg.waiting, reg.installing].some(worker =>
        worker && !new URL(worker.scriptURL).pathname.endsWith('/firebase-messaging-sw.js')))
    if (conflict) throw new Error('기존 서비스 워커와 충돌할 수 있어 푸시 등록을 중단했습니다.')
    const workerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    const messaging = getMessaging(firebaseApp)
    // 서버는 FCM 등록 토큰을 받습니다. 최신 FID API와 혼용하지 않습니다.
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: workerRegistration })
    if (!token) throw new Error('Firebase 기기 토큰을 발급받지 못했습니다.')
    // 요청 도중 로그아웃한 사용자의 토큰을 다른 계정으로 등록하지 않습니다.
    if (useAuthStore.getState().accessToken !== accessToken) return
    await registerPushToken(token)
    currentToken = token
    syncedForAccessToken = accessToken
  })()
  registerInFlight = task
  try { await task } finally { if (registerInFlight === task) registerInFlight = null }
}

/** 서버 명세에 따라 기기를 해제하고 FCM 구독도 해제합니다. */
export async function unregisterPushDevice(): Promise<void> {
  // 동시 로그인·로그아웃 요청이 겹쳐 토큰이 재등록되는 것을 막습니다.
  if (registerInFlight) await registerInFlight.catch(() => undefined)
  const token = currentToken
  currentToken = null
  syncedForAccessToken = null
  let failure: unknown = null
  if (token) {
    try { await deletePushToken(token) } catch (error: unknown) { failure = error }
  }
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator &&
    'Notification' in window && Notification.permission === 'granted') {
    try {
      const { isSupported, getMessaging, deleteToken } = await import('firebase/messaging')
      if (await isSupported()) {
        const { firebaseApp } = await import('../config/firebase')
        await deleteToken(getMessaging(firebaseApp))
      }
    } catch (error: unknown) { if (!failure) failure = error }
  }
  if (failure) throw failure
}
