/* 또랑 웹 푸시 수신 워커. Firebase SDK가 발급한 구독으로 도착한 PushEvent만 처리합니다.
 * 로그인 정보, Firebase 서버 비밀키, 토큰은 이 파일에 저장하지 않습니다. */
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {}
    try { payload = event.data ? event.data.json() : {} } catch { /* 빈 데이터 */ }
    if (!payload || typeof payload !== 'object') payload = {}
    const notification = payload.notification && typeof payload.notification === 'object' ? payload.notification : {}
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
    const title = String(notification.title || data.title || '또랑 알림').slice(0, 80)
    const body = String(notification.body || data.body || '새로운 알림이 도착했습니다.').slice(0, 200)
    const rawTarget = data.url || data.link || '/notifications'
    let url = '/notifications'
    try {
      const candidate = new URL(String(rawTarget), self.location.origin)
      if (candidate.origin === self.location.origin) url = candidate.pathname + candidate.search + candidate.hash
    } catch { /* 외부 주소는 사용하지 않습니다. */ }
    await self.registration.showNotification(title, { body, data: { url } })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data && typeof event.notification.data.url === 'string'
    ? event.notification.data.url : '/notifications'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        if ('navigate' in client) await client.navigate(new URL(target, self.location.origin).href)
        await client.focus()
        return
      }
    }
    await self.clients.openWindow(target)
  })())
})
