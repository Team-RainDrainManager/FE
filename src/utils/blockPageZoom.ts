// 화면 전체 확대(두 손가락 벌리기·두 번 탭·Ctrl+휠·Ctrl+＋/－)를 막습니다.
// 지도(카카오맵) 안에서는 지도 자체 확대·축소가 동작하도록 그대로 둡니다.
// iOS Safari는 viewport의 user-scalable=no를 무시하므로 제스처 이벤트를 직접 막아야 합니다.
// 두 번 탭 확대는 index.css의 html { touch-action: manipulation }이 막습니다.

const PINCH_ALLOWED = '.dd-kakao-map'

const insideMap = (target: EventTarget | null) =>
  target instanceof Element && target.closest(PINCH_ALLOWED) !== null

const ZOOM_KEYS = new Set(['+', '=', '-', '_', '0'])

export function blockPageZoom() {
  const stopGesture = (event: Event) => {
    if (!insideMap(event.target)) event.preventDefault()
  }

  const stopPinch = (event: TouchEvent) => {
    if (event.touches.length > 1 && !insideMap(event.target)) event.preventDefault()
  }

  // 노트북 터치패드 확대와 Ctrl+휠은 ctrlKey가 켜진 wheel 이벤트로 들어옵니다.
  const stopWheelZoom = (event: WheelEvent) => {
    if (event.ctrlKey && !insideMap(event.target)) event.preventDefault()
  }

  const stopKeyZoom = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && ZOOM_KEYS.has(event.key)) event.preventDefault()
  }

  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, stopGesture, { passive: false })
  }
  document.addEventListener('touchmove', stopPinch, { passive: false })
  document.addEventListener('wheel', stopWheelZoom, { passive: false })
  document.addEventListener('keydown', stopKeyZoom)
}
