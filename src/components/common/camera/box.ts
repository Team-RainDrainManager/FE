import { CAMERA } from './config'

/** 사진 폭·높이 대비 비율로 나타낸 박스 */
export type Box = { x: number; y: number; w: number; h: number }

export type DragMode =
  | { move: true }
  | { move: false; n: boolean; s: boolean; e: boolean; w: boolean }

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** 박스를 한 변마다 박스 크기 × pad 만큼 넓히고 사진 안으로 자릅니다. */
export function expandBox(box: Box, pad: number): Box {
  const x0 = clamp(box.x - box.w * pad, 0, 1)
  const y0 = clamp(box.y - box.h * pad, 0, 1)
  const x1 = clamp(box.x + box.w * (1 + pad), 0, 1)
  const y1 = clamp(box.y + box.h * (1 + pad), 0, 1)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** 드래그 시작 박스에서 (dx, dy)만큼 움직였을 때의 새 박스입니다. 값은 사진 대비 비율입니다. */
export function dragBox(start: Box, mode: DragMode, dx: number, dy: number): Box {
  if (mode.move) {
    return {
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
      w: start.w,
      h: start.h,
    }
  }
  const min = CAMERA.minBoxSize
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (mode.w) left = clamp(left + dx, 0, right - min)
  if (mode.e) right = clamp(right + dx, left + min, 1)
  if (mode.n) top = clamp(top + dy, 0, bottom - min)
  if (mode.s) bottom = clamp(bottom + dy, top + min, 1)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

export function boxStyle(box: Box) {
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  }
}

/** 컨테이너(cw×ch) 안에 사진(iw×ih)을 비율 유지로 넣었을 때 사진이 놓이는 위치입니다. */
export function containRect(cw: number, ch: number, iw: number, ih: number) {
  if (!cw || !ch || !iw || !ih) return null
  const scale = Math.min(cw / iw, ch / ih)
  const width = iw * scale
  const height = ih * scale
  return { left: (cw - width) / 2, top: (ch - height) / 2, width, height }
}

/**
 * 원본에서 흰 점선 범위(빨간 박스 + 주변)만 잘라 내고 빨간 박스 선을 그립니다.
 * 서버로는 이 사진만 갑니다. 촬영기 앱의 cropForAi와 같은 계산입니다.
 */
export function cropWithBox(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: Box,
): HTMLCanvasElement {
  const area = expandBox(box, CAMERA.contextPadding)
  const sx = area.x * sourceWidth
  const sy = area.y * sourceHeight
  const sw = Math.max(1, area.w * sourceWidth)
  const sh = Math.max(1, area.h * sourceHeight)
  const scale = Math.min(1, CAMERA.upload.longEdge / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('사진을 만들지 못했어요.')
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#ff0000'
  context.lineWidth = Math.max(2, Math.round(canvas.width / 200))
  context.strokeRect(
    (box.x * sourceWidth - sx) * scale,
    (box.y * sourceHeight - sy) * scale,
    box.w * sourceWidth * scale,
    box.h * sourceHeight * scale,
  )
  return canvas
}
