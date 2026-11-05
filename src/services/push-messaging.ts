import { deletePushToken, registerPushToken } from '../apis/push-tokens'
import { getNotificationSettings } from '../apis/profile-settings'
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

/** 사용자 조작(기존 알림 ON 스위치)에서만 호출하세요. 자동 권한 팝업은 금지합니다. */
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
