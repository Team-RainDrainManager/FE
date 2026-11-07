import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react'

type CameraFacing = 'environment' | 'user'
type CaptureMode = 'auto' | 'manual' | 'file'
type Box = { x: number; y: number; w: number; h: number }
type Corner = 'nw' | 'ne' | 'sw' | 'se'
type DragMode = 'move' | Corner
type Point = { x: number; y: number }
type Quad = Record<Corner, Point>
type DetectionStatus = 'searching' | 'found' | 'not-found'


type Props = {
  title: string
  onCapture: (file: File) => void
  onCancel: () => void
  allowFileFallback?: boolean
}

type Shot = {
  file: File
  url: string
  width: number
  height: number
  mode: CaptureMode
}

type LiveStatus = {
  still: boolean | null
  sensor: boolean
  tilt: 'ok' | 'low' | 'unknown'
  sharp: boolean
  bright: boolean
  countdown: number
}

const GUIDE: Box = { x: 0.15, y: 0.25, w: 0.7, h: 0.5 }
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']
const AUTO_PREFERENCE_KEY = 'torang:camera-auto'
const AUTO = {
  analysisWidth: 160,
  analysisFps: 8,
  stableMs: 700,
  countdownSteps: 3,
  countdownStepMs: 400,
  maxRotationDegPerSec: 15,
  maxAccel: 0.8,
  maxFrameDiff: 6,
  minSharpness: 35,
  minBrightness: 45,
  minTilt: -15,
  maxTilt: 60,
} as const

const EMPTY_LIVE: LiveStatus = {
  still: null,
  sensor: false,
  tilt: 'unknown',
  sharp: false,
  bright: true,
  countdown: 0,
}

function readAutoPreference(): boolean {
  try {
    const value = window.localStorage.getItem(AUTO_PREFERENCE_KEY)
    return value === null ? true : value === 'true'
  } catch {
    return true
  }
}

function saveAutoPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(AUTO_PREFERENCE_KEY, String(enabled))
  } catch {
    // 시크릿 모드 등에서 저장소를 쓸 수 없어도 촬영은 진행할 수 있습니다.
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError':
        return '카메라 권한이 거부됐어요. 브라우저 설정에서 카메라를 허용해주세요.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return '사용할 수 있는 카메라를 찾지 못했어요.'
      case 'NotReadableError':
      case 'TrackStartError':
        return '카메라를 사용할 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.'
      case 'OverconstrainedError':
        return '요청한 카메라 설정을 사용할 수 없어요.'
    }
  }
  return '카메라를 실행하지 못했어요. 다시 시도해주세요.'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** object-cover로 영상이 화면을 채울 때, 화면의 가이드에 대응하는 원본 영상 좌표를 구합니다. */
function sourceGuideRect(
  videoWidth: number,
  videoHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (!videoWidth || !videoHeight || !viewportWidth || !viewportHeight) {
    return null
  }

  const scale = Math.max(
    viewportWidth / videoWidth,
    viewportHeight / videoHeight,
  )
  const renderedWidth = videoWidth * scale
  const renderedHeight = videoHeight * scale
  const croppedLeft = (renderedWidth - viewportWidth) / 2
  const croppedTop = (renderedHeight - viewportHeight) / 2

  return {
    x: (croppedLeft + GUIDE.x * viewportWidth) / scale,
    y: (croppedTop + GUIDE.y * viewportHeight) / scale,
    width: (GUIDE.w * viewportWidth) / scale,
    height: (GUIDE.h * viewportHeight) / scale,
  }
}

function boxStyle(box: Box) {
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  }
}

function defaultQuad(): Quad {
  return {
    nw: { x: GUIDE.x, y: GUIDE.y },
    ne: { x: GUIDE.x + GUIDE.w, y: GUIDE.y },
    se: { x: GUIDE.x + GUIDE.w, y: GUIDE.y + GUIDE.h },
    sw: { x: GUIDE.x, y: GUIDE.y + GUIDE.h },
  }
}

function quadPoints(quad: Quad): Point[] {
  return [quad.nw, quad.ne, quad.se, quad.sw]
}

function polygonArea(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    sum += points[i].x * next.y - next.x * points[i].y
  }
  return sum / 2
}

function validQuad(quad: Quad): boolean {
  const points = quadPoints(quad)
  if (polygonArea(points) < 0.015) return false
  for (let i = 0; i < 4; i++) {
    const a = points[i]
    const b = points[(i + 1) % 4]
    const c = points[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) -
      (b.y - a.y) * (c.x - b.x)
    if (cross <= 0.002) return false
  }
  return true
}

function dragQuad(original: Quad, mode: DragMode, dx: number, dy: number): Quad {
  if (mode === 'move') {
    const points = quadPoints(original)
    const minX = Math.min(...points.map((point) => point.x))
    const maxX = Math.max(...points.map((point) => point.x))
    const minY = Math.min(...points.map((point) => point.y))
    const maxY = Math.max(...points.map((point) => point.y))
    const shiftX = clamp(dx, -minX, 1 - maxX)
    const shiftY = clamp(dy, -minY, 1 - maxY)
    return {
      nw: { x: original.nw.x + shiftX, y: original.nw.y + shiftY },
      ne: { x: original.ne.x + shiftX, y: original.ne.y + shiftY },
      se: { x: original.se.x + shiftX, y: original.se.y + shiftY },
      sw: { x: original.sw.x + shiftX, y: original.sw.y + shiftY },
    }
  }
  const updated = {
    ...original,
    [mode]: {
      x: clamp(original[mode].x + dx, 0.01, 0.99),
      y: clamp(original[mode].y + dy, 0.01, 0.99),
    },
  }
  return validQuad(updated) ? updated : original
}

function quadSvgPoints(quad: Quad): string {
  return quadPoints(quad)
    .map((point) => `${point.x * 1000},${point.y * 1000}`)
    .join(' ')
}

// AI 객체 탐지 모델이 없는 상황에서는 명확한 사각형 윤곽 후보만 자동으로 제안합니다.
// 다른 사각형이 검출될 수 있으므로 촬영 후 반드시 조절할 수 있도록 합니다.
type DetectedLine = { theta: number; rho: number; votes: number }
type QuadCandidate = { corners: Point[]; score: number }

function intersection(a: DetectedLine, b: DetectedLine): Point | null {
  const aCos = Math.cos(a.theta)
  const aSin = Math.sin(a.theta)
  const bCos = Math.cos(b.theta)
  const bSin = Math.sin(b.theta)
  const determinant = aCos * bSin - aSin * bCos
  if (Math.abs(determinant) < 0.22) return null
  return {
    x: (a.rho * bSin - aSin * b.rho) / determinant,
    y: (aCos * b.rho - a.rho * bCos) / determinant,
  }
}

function angularDifference(a: number, b: number): number {
  const difference = Math.abs(a - b) % Math.PI
  return Math.min(difference, Math.PI - difference)
}

function sortCorners(points: Point[]): Point[] {
  const cx = points.reduce((sum, point) => sum + point.x, 0) / 4
  const cy = points.reduce((sum, point) => sum + point.y, 0) / 4
  const ordered = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  )
  const nwIndex = ordered.reduce(
    (best, point, index) =>
      point.x + point.y < ordered[best].x + ordered[best].y ? index : best,
    0,
  )
  return [...ordered.slice(nwIndex), ...ordered.slice(0, nwIndex)]
}

function borderSupport(
  start: Point,
  end: Point,
  edges: Uint8Array,
  width: number,
  height: number,
): number {
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  const samples = Math.max(12, Math.round(length / 3))
  const tangentX = (end.x - start.x) / length
  const tangentY = (end.y - start.y) / length
  let hits = 0
  for (let i = 1; i < samples; i++) {
    const t = i / samples
    const x = start.x + (end.x - start.x) * t
    const y = start.y + (end.y - start.y) * t
    let found = false
    for (let offset = -3; offset <= 3; offset += 1) {
      const px = Math.round(x - tangentY * offset)
      const py = Math.round(y + tangentX * offset)
      if (px >= 0 && px < width && py >= 0 && py < height && edges[py * width + px]) {
        found = true
        break
      }
    }
    if (found) hits++
  }
  return hits / Math.max(1, samples - 1)
}

/**
 * 브라우저 기본 Canvas만 사용하는 직선/사각형 후보 탐지.
 * 모델 기반 빗물받이 분류가 아니라, 화면 중앙의 강한 사각 윤곽을 찾습니다.
 * 모든 좌표는 imageData 픽셀 기준이며 실패하면 null을 반환합니다.
 */
function findDrainQuadFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Quad | null {
  if (width < 80 || height < 80) return null

  const gray = toGray(data)
  const smoothed = new Float32Array(gray.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      smoothed[index] = (
        gray[index] * 4 +
        gray[index - 1] + gray[index + 1] +
        gray[index - width] + gray[index + width]
      ) / 8
    }
  }

  const edgeStrength = new Float32Array(gray.length)
  const normals = new Float32Array(gray.length)
  const histogram = new Uint32Array(256)
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const index = y * width + x
      const dx =
        -smoothed[index - width - 1] + smoothed[index - width + 1] -
        2 * smoothed[index - 1] + 2 * smoothed[index + 1] -
        smoothed[index + width - 1] + smoothed[index + width + 1]
      const dy =
        -smoothed[index - width - 1] - 2 * smoothed[index - width] -
        smoothed[index - width + 1] + smoothed[index + width - 1] +
        2 * smoothed[index + width] + smoothed[index + width + 1]
      const strength = Math.hypot(dx, dy)
      edgeStrength[index] = strength
      let normal = Math.atan2(dy, dx)
      if (normal < 0) normal += Math.PI
      if (normal >= Math.PI) normal -= Math.PI
      normals[index] = normal
      histogram[Math.min(255, Math.floor(strength / 4))]++
    }
  }

  // 사진 전체에서 상위 약 16%의 강한 경계만 사용합니다.
  const validPixels = (width - 4) * (height - 4)
  let remaining = validPixels * 0.84
  let percentileBin = 0
  for (let i = 0; i < 256; i++) {
    remaining -= histogram[i]
    if (remaining <= 0) {
      percentileBin = i
      break
    }
  }
  const threshold = Math.max(85, percentileBin * 4)
  const edges = new Uint8Array(gray.length)
  const angleBins = 90
  const rhoStep = 3
  const maxRho = Math.ceil(Math.hypot(width, height))
  const rhoBins = Math.ceil((maxRho * 2) / rhoStep) + 2
  const votes = new Uint16Array(angleBins * rhoBins)
  const cosines = Array.from({ length: angleBins }, (_, i) => Math.cos(i * Math.PI / angleBins))
  const sines = Array.from({ length: angleBins }, (_, i) => Math.sin(i * Math.PI / angleBins))

  let strongCount = 0
  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      const index = y * width + x
      if (edgeStrength[index] < threshold) continue
      // 중첩된 고대비 픽셀을 모두 투표시키지 않도록 고르게 샘플링합니다.
      const gx = edgeStrength[index - 1]
      const gy = edgeStrength[index - width]
      if (edgeStrength[index] < gx || edgeStrength[index] < gy) continue
      edges[index] = 1
      if ((x + y) % 2 !== 0) continue
      strongCount++
      const base = Math.round(normals[index] * angleBins / Math.PI) % angleBins
      for (let delta = -1; delta <= 1; delta++) {
        const angle = (base + delta + angleBins) % angleBins
        const rho = x * cosines[angle] + y * sines[angle]
        const bin = Math.round((rho + maxRho) / rhoStep)
        votes[angle * rhoBins + bin]++
      }
    }
  }
  if (strongCount < 80) return null

  const minVotes = Math.max(14, Math.round(Math.min(width, height) * 0.055))
  const peaks: DetectedLine[] = []
  for (let angle = 0; angle < angleBins; angle++) {
    for (let bin = 2; bin < rhoBins - 2; bin++) {
      const count = votes[angle * rhoBins + bin]
      if (count < minVotes) continue
      let isMax = true
      for (let da = -2; da <= 2 && isMax; da++) {
        const otherAngle = (angle + da + angleBins) % angleBins
        for (let dr = -2; dr <= 2; dr++) {
          if (da === 0 && dr === 0) continue
          const otherBin = bin + dr
          if (otherBin < 0 || otherBin >= rhoBins) continue
          if (votes[otherAngle * rhoBins + otherBin] > count) {
            isMax = false
            break
          }
        }
      }
      if (isMax) {
        peaks.push({
          theta: angle * Math.PI / angleBins,
          rho: bin * rhoStep - maxRho,
          votes: count,
        })
      }
    }
  }
  const strongLines = peaks.sort((a, b) => b.votes - a.votes).slice(0, 36)
  if (strongLines.length < 4) return null

  const alignedPairs: Array<{ first: DetectedLine; second: DetectedLine; score: number }> = []
  for (let a = 0; a < strongLines.length; a++) {
    for (let b = a + 1; b < strongLines.length; b++) {
      const first = strongLines[a]
      const second = strongLines[b]
      if (angularDifference(first.theta, second.theta) > Math.PI / 9) continue
      // 동일 방향에서 일정 거리 떨어진 두 개의 경계여야 합니다.
      const wrapped = Math.abs(first.theta - second.theta) > Math.PI / 2
      const offset = Math.abs(first.rho - (wrapped ? -second.rho : second.rho))
      if (offset < Math.min(width, height) * 0.12) continue
      alignedPairs.push({ first, second, score: Math.min(first.votes, second.votes) })
    }
  }
  // 금속 격자의 내부 세로줄이 상위 순위를 독점하지 않도록
  // 서로 다른 방향별로 후보를 균등하게 선택합니다.
  const byDirection: Array<typeof alignedPairs> = Array.from({ length: 6 }, () => [])
  for (const pair of alignedPairs) {
    const angle = ((pair.first.theta * 180 / Math.PI) + 15) % 180
    const bucket = Math.floor(angle / 30)
    byDirection[bucket].push(pair)
  }
  const pairSeparation = (item: (typeof alignedPairs)[number]) => {
    const wrapped = Math.abs(item.first.theta - item.second.theta) > Math.PI / 2
    return Math.abs(item.first.rho - (wrapped ? -item.second.rho : item.second.rho))
  }
  const candidatePairs = byDirection.flatMap((items) => {
    const byStrength = [...items].sort((a, b) => b.score - a.score).slice(0, 12)
    const byWidth = [...items]
      .sort((a, b) => pairSeparation(b) - pairSeparation(a))
      .slice(0, 12)
    return [...new Set([...byStrength, ...byWidth])]
  })
  let best: QuadCandidate | null = null

  for (let a = 0; a < candidatePairs.length; a++) {
    const first = candidatePairs[a]
    for (let b = a + 1; b < candidatePairs.length; b++) {
      const second = candidatePairs[b]
      const angle = angularDifference(first.first.theta, second.first.theta)
      if (angle < Math.PI * 0.32 || angle > Math.PI * 0.68) continue

      const intersections = [
        intersection(first.first, second.first),
        intersection(first.second, second.first),
        intersection(first.second, second.second),
        intersection(first.first, second.second),
      ]
      if (intersections.some((point) => point === null)) continue
      const points = sortCorners(intersections as Point[])
      if (points.some((point) =>
        point.x < width * 0.02 || point.x > width * 0.98 ||
        point.y < height * 0.02 || point.y > height * 0.98,
      )) continue
      const area = polygonArea(points) / (width * height)
      if (area < 0.055 || area > 0.72) continue
      const cx = points.reduce((sum, point) => sum + point.x, 0) / (width * 4)
      const cy = points.reduce((sum, point) => sum + point.y, 0) / (height * 4)
      const centerError = Math.hypot(cx - 0.5, cy - 0.5)
      if (centerError > 0.29) continue

      const normalized: Quad = {
        nw: { x: points[0].x / width, y: points[0].y / height },
        ne: { x: points[1].x / width, y: points[1].y / height },
        se: { x: points[2].x / width, y: points[2].y / height },
        sw: { x: points[3].x / width, y: points[3].y / height },
      }
      if (!validQuad(normalized)) continue

      const sideSupports = points.map((point, index) =>
        borderSupport(point, points[(index + 1) % 4], edges, width, height),
      )
      const support = sideSupports.reduce((sum, value) => sum + value, 0) / 4
      if (support < 0.44 || Math.min(...sideSupports) < 0.27) continue
      const aspect = Math.max(
        Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y),
      ) / Math.max(1, Math.min(
        Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        Math.hypot(points[2].x - points[1].x, points[2].y - points[1].y),
      ))
      if (aspect > 5) continue
      const score = support * 0.45 +
        (1 - Math.min(1, centerError / 0.3)) * 0.18 +
        Math.min(1, area / 0.38) * 0.32 +
        Math.min(1, (first.score + second.score) / 110) * 0.05
      if (!best || score > best.score) best = { corners: points, score }
    }
  }

  if (!best || best.score < 0.50) return null
  const [nw, ne, se, sw] = best.corners
  return {
    nw: { x: nw.x / width, y: nw.y / height },
    ne: { x: ne.x / width, y: ne.y / height },
    se: { x: se.x / width, y: se.y / height },
    sw: { x: sw.x / width, y: sw.y / height },
  }
}

function detectQuadInPreview(
  image: HTMLImageElement,
  viewportWidth: number,
  viewportHeight: number,
): Quad | null {
  if (viewportWidth <= 0 || viewportHeight <= 0) return null
  const scale = Math.min(1, 460 / Math.max(viewportWidth, viewportHeight))
  const width = Math.max(80, Math.round(viewportWidth * scale))
  const height = Math.max(80, Math.round(viewportHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !image.naturalWidth || !image.naturalHeight) return null

  // 이미지와 빨간 테두리가 모두 object-cover의 동일한 시각 좌표계를 사용합니다.
  const cropScale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  )
  const cropWidth = width / cropScale
  const cropHeight = height / cropScale
  const cropLeft = (image.naturalWidth - cropWidth) / 2
  const cropTop = (image.naturalHeight - cropHeight) / 2
  context.drawImage(
    image,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height,
  )
  try {
    return findDrainQuadFromPixels(
      context.getImageData(0, 0, width, height).data,
      width,
      height,
    )
  } catch {
    return null
  }
}

/** iOS에서는 클릭 이벤트 안에서 호출해야 동작 센서 권한을 요청할 수 있습니다. */
async function requestMotionPermission() {
  type PermissionApi = {
    requestPermission?: () => Promise<'granted' | 'denied'>
  }
  const motion = (window as Window & { DeviceMotionEvent?: PermissionApi })
    .DeviceMotionEvent
  const orientation = (window as Window & { DeviceOrientationEvent?: PermissionApi })
    .DeviceOrientationEvent
  try {
    const permissions: Promise<'granted' | 'denied'>[] = []
    if (motion?.requestPermission) permissions.push(motion.requestPermission())
    if (orientation?.requestPermission) {
      permissions.push(orientation.requestPermission())
    }
    if (permissions.length) await Promise.all(permissions)
  } catch {
    // 권한을 사용할 수 없는 경우 영상 프레임 비교로 자동 촬영합니다.
  }
}

/** 원본의 MotionWatcher처럼 기울기·움직임을 측정합니다. */
class MotionWatcher {
  available = false
  beta: number | null = null
  private lastMovingAt = 0

  private onMotion = (event: DeviceMotionEvent) => {
    const rotation = event.rotationRate
    const acceleration = event.acceleration
    const hasRotation =
      rotation?.alpha != null &&
      rotation.beta != null &&
      rotation.gamma != null
    const hasAccel =
      acceleration?.x != null &&
      acceleration.y != null &&
      acceleration.z != null

    if (!hasRotation && !hasAccel) return
    this.available = true

    const rotationSpeed = hasRotation
      ? Math.hypot(rotation.alpha!, rotation.beta!, rotation.gamma!)
      : 0
    const accelerationSpeed = hasAccel
      ? Math.hypot(acceleration.x!, acceleration.y!, acceleration.z!)
      : 0

    if (
      rotationSpeed > AUTO.maxRotationDegPerSec ||
      accelerationSpeed > AUTO.maxAccel
    ) {
      this.lastMovingAt = performance.now()
    }
  }

  private onOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta !== null) this.beta = event.beta
  }

  start() {
    this.available = false
    this.beta = null
    this.lastMovingAt = performance.now()
    window.addEventListener('devicemotion', this.onMotion)
    window.addEventListener('deviceorientation', this.onOrientation)
  }

  stop() {
    window.removeEventListener('devicemotion', this.onMotion)
    window.removeEventListener('deviceorientation', this.onOrientation)
  }

  stillFor(now: number): number | null {
    return this.available ? now - this.lastMovingAt : null
  }
}

function toGray(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4)
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] =
      0.299 * data[j] +
      0.587 * data[j + 1] +
      0.114 * data[j + 2]
  }
  return gray
}

function laplacianVariance(gray: Float32Array, width: number, height: number) {
  let sum = 0
  let sumSquared = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      const value =
        4 * gray[index] -
        gray[index - 1] -
        gray[index + 1] -
        gray[index - width] -
        gray[index + width]
      sum += value
      sumSquared += value * value
      count += 1
    }
  }
  if (!count) return 0
  const mean = sum / count
  return sumSquared / count - mean * mean
}

function meanOf(gray: Float32Array) {
  let sum = 0
  for (const value of gray) sum += value
  return gray.length ? sum / gray.length : 0
}

function meanAbsDiff(previous: Float32Array, current: Float32Array) {
  if (previous.length !== current.length || !current.length) return 255
  let sum = 0
  for (let i = 0; i < current.length; i++) {
    sum += Math.abs(previous[i] - current[i])
  }
  return sum / current.length
}

function sampleGuide(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  viewportWidth: number,
  viewportHeight: number,
): { gray: Float32Array; width: number; height: number } | null {
  const source = sourceGuideRect(
    video.videoWidth,
    video.videoHeight,
    viewportWidth,
    viewportHeight,
  )
  if (!source) return null

  const width = AUTO.analysisWidth
  const height = Math.max(8, Math.round((width * source.height) / source.width))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  // 화면에 실제로 보이는 흰색 가이드 영역과 동일한 위치를 분석합니다.
  context.drawImage(
    video,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    width,
    height,
  )

  return { gray: toGray(context.getImageData(0, 0, width, height).data), width, height }
}

function GuideCorners({ good }: { good: boolean }) {
  const color = good ? '#22C55E' : '#FFFFFF'
  const border = { borderColor: color }
  const corners = 'absolute h-7 w-7'
  return (
    <>
      <div
        className="absolute inset-0 border-2 border-dashed"
        style={{ borderColor: `${color}99` }}
      />
      <div className={`${corners} left-0 top-0 border-l-4 border-t-4`} style={border} />
      <div className={`${corners} right-0 top-0 border-r-4 border-t-4`} style={border} />
      <div className={`${corners} bottom-0 left-0 border-b-4 border-l-4`} style={border} />
      <div className={`${corners} bottom-0 right-0 border-b-4 border-r-4`} style={border} />
    </>
  )
}

function hintText(live: LiveStatus, autoEnabled: boolean) {
  if (live.countdown > 0) return '그대로 멈춰 주세요. 자동으로 촬영할게요.'
  if (live.tilt === 'low') return '휴대폰을 조금 더 숙여 주세요.'
  if (!live.bright) return '화면이 어두워요. 밝은 곳에서 촬영해 주세요.'
  if (live.still === false) return '휴대폰을 잠깐 멈춰 주세요.'
  if (live.still === true && !live.sharp) {
    return '사진이 흐려요. 거리를 조금 조절해 주세요.'
  }
  return autoEnabled
    ? '가이드 안에 빗물받이를 맞추고 멈추면 자동 촬영돼요.'
    : '가이드 안에 빗물받이를 맞춘 뒤 촬영 버튼을 눌러 주세요.'
}

export default function CameraCapture({
  title,
  onCapture,
  onCancel,
  allowFileFallback = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const motionRef = useRef(new MotionWatcher())
  const capturingRef = useRef(false)
  const readyRef = useRef(false)
  const autoEnabledRef = useRef(true)
  const objectUrlsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(false)

  const dragRef = useRef<{
    mode: DragMode
    pointerX: number
    pointerY: number
    start: Quad
    width: number
    height: number
  } | null>(null)

  const [facingMode, setFacingMode] = useState<CameraFacing>('environment')
  const [retryCount, setRetryCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoEnabled, setAutoEnabled] = useState(readAutoPreference)
  const [live, setLive] = useState<LiveStatus>(EMPTY_LIVE)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [shot, setShot] = useState<Shot | null>(null)
  const [quad, setQuad] = useState<Quad>(defaultQuad)
  const [detection, setDetection] = useState<DetectionStatus>('searching')
  const [detectionAttempt, setDetectionAttempt] = useState(0)

  // interval에서 현재 설정을 읽도록 유지합니다.
  const hasPreview = shot !== null

  useEffect(() => {
    autoEnabledRef.current = autoEnabled
  }, [autoEnabled])

  const clearShotUrl = (url: string) => {
    URL.revokeObjectURL(url)
    objectUrlsRef.current.delete(url)
  }

  // 컴포넌트가 닫힐 때 미리보기 URL을 반환합니다.
  useEffect(() => {
    mountedRef.current = true
    const urls = objectUrlsRef.current
    return () => {
      mountedRef.current = false
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  // 원본 CameraCapture의 카메라 전환·재시도·스트림 해제를 유지합니다.
  useEffect(() => {
    if (hasPreview) return

    let cancelled = false
    const videoElement = videoRef.current
    let ownedStream: MediaStream | null = null

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setError('카메라 API를 사용할 수 없어요. HTTPS 또는 localhost에서 실행해주세요.')
          setLoading(false)
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            // 휴대폰에서는 세로 영상을 우선 요청하고, 지원하지 않는 기기는 CSS cover로 보정합니다.
            width: { ideal: 1080 },
            height: { ideal: 1440 },
            aspectRatio: { ideal: 3 / 4 },
          },
        })
        if (cancelled) {
          stopStream(stream)
          return
        }

        ownedStream = stream
        streamRef.current = stream
        if (videoElement) {
          videoElement.srcObject = stream
          try {
            await videoElement.play()
          } catch {
            // autoPlay가 제한된 브라우저에서는 video의 기본 동작을 기다립니다.
          }
        }
        if (!cancelled) {
          setLoading(false)
          setError(null)
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(cameraErrorMessage(caughtError))
          setLoading(false)
        }
      }
    }

    void openCamera()

    return () => {
      cancelled = true
      stopStream(ownedStream)
      if (streamRef.current === ownedStream) streamRef.current = null
      if (videoElement) videoElement.srcObject = null
    }
  }, [facingMode, retryCount, hasPreview])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setViewport({ width: rect.width, height: rect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // 촬영된 사진의 표시 영역에서 사각 윤곽을 한 번 찾아, 네 꼭짓점을 제안합니다.
  // 결과가 없으면 수동 네모가 유지됩니다. 이전 사진의 비동기 결과는 무시합니다.
  useEffect(() => {
    if (!shot || viewport.width < 80 || viewport.height < 80) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      // 이미지 디코딩 완료 후 UI를 먼저 그려, 저사양 폰에서도 순간 멈춤을 줄입니다.
      window.setTimeout(() => {
        if (cancelled) return
        const detected = detectQuadInPreview(image, viewport.width, viewport.height)
        if (cancelled) return
        if (detected) setQuad(detected)
        else setQuad(defaultQuad())
        setDetection(detected ? 'found' : 'not-found')
      }, 30)
    }
    image.onerror = () => {
      if (!cancelled) setDetection('not-found')
    }
    image.src = shot.url
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
    }
  }, [shot, viewport.width, viewport.height, detectionAttempt])

  useEffect(() => {
    if (hasPreview) return
    const motion = motionRef.current
    motion.start()
    return () => motion.stop()
  }, [hasPreview])

  const changeCamera = () => {
    capturingRef.current = false
    readyRef.current = false
    setReady(false)
    setVideoSize({ width: 0, height: 0 })
    setLive(EMPTY_LIVE)
    setLoading(true)
    setError(null)
    setFacingMode((previous) =>
      previous === 'environment' ? 'user' : 'environment',
    )
  }

  const retryCamera = () => {
    capturingRef.current = false
    readyRef.current = false
    setReady(false)
    setVideoSize({ width: 0, height: 0 })
    setLive(EMPTY_LIVE)
    setLoading(true)
    setError(null)
    setRetryCount((previous) => previous + 1)
  }

  const toggleAuto = () => {
    const next = !autoEnabledRef.current
    autoEnabledRef.current = next
    setAutoEnabled(next)
    saveAutoPreference(next)
    setLive(EMPTY_LIVE)
    if (next) void requestMotionPermission()
  }

  const takePhoto = useCallback((mode: 'manual' | 'auto') => {
    const video = videoRef.current
    if (
      !video ||
      !readyRef.current ||
      capturingRef.current ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return
    }

    capturingRef.current = true
    setCapturing(true)
    setError(null)

    // 원본 사진은 자르거나 박스를 그리지 않고 저장해 AI API의 입력을 유지합니다.
    const longEdge = Math.max(video.videoWidth, video.videoHeight)
    const scale = Math.min(1, 1920 / longEdge)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')

    if (!context) {
      capturingRef.current = false
      setCapturing(false)
      setError('사진을 촬영하지 못했어요.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!mountedRef.current) return
        if (!blob) {
          capturingRef.current = false
          setCapturing(false)
          setError('사진 저장에 실패했어요. 다시 촬영해주세요.')
          return
        }
        const capturedAt = Date.now()
        const file = new File([blob], `drain-inspection-${capturedAt}.jpg`, {
          type: 'image/jpeg',
          lastModified: capturedAt,
        })
        const url = URL.createObjectURL(file)
        objectUrlsRef.current.add(url)
        setQuad(defaultQuad())
        setDetection('searching')
        setShot({
          file,
          url,
          width: canvas.width,
          height: canvas.height,
          mode,
        })
        setCapturing(false)
        setLive(EMPTY_LIVE)
        navigator.vibrate?.(40)
      },
      'image/jpeg',
      0.9,
    )
  }, [])

  // 원본 코드처럼 센서가 있으면 센서, 없으면 프레임 변화량을 사용합니다.
  useEffect(() => {
    if (!ready || hasPreview || error) return

    const canvas = document.createElement('canvas')
    let previous: Float32Array | null = null
    let lastUnstable = performance.now()
    let allGoodSince: number | null = null

    const timer = window.setInterval(() => {
      const video = videoRef.current
      if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        capturingRef.current
      ) {
        return
      }

      let region: ReturnType<typeof sampleGuide>
      try {
        region = sampleGuide(video, canvas, viewport.width, viewport.height)
      } catch {
        // 일부 모바일 브라우저에서는 순간적으로 프레임을 읽지 못할 수 있습니다.
        return
      }
      if (!region) return

      const now = performance.now()
      const sharpness = laplacianVariance(region.gray, region.width, region.height)
      const brightness = meanOf(region.gray)
      const diff = previous ? meanAbsDiff(previous, region.gray) : 255
      previous = region.gray

      const sensorStill = motionRef.current.stillFor(now)
      if (sensorStill === null && diff > AUTO.maxFrameDiff) {
        lastUnstable = now
      }
      const stillMs = sensorStill ?? now - lastUnstable
      const still = stillMs >= AUTO.stableMs
      const beta = motionRef.current.beta
      const portrait = window.innerHeight >= window.innerWidth
      const tilt: LiveStatus['tilt'] =
        beta === null || !portrait
          ? 'unknown'
          : beta >= AUTO.minTilt && beta <= AUTO.maxTilt
            ? 'ok'
            : 'low'
      const sharp = sharpness >= AUTO.minSharpness
      const bright = brightness >= AUTO.minBrightness
      const allGood = still && tilt !== 'low' && sharp && bright

      let countdown = 0
      if (autoEnabledRef.current && allGood) {
        if (allGoodSince === null) allGoodSince = now
        const step = Math.floor((now - allGoodSince) / AUTO.countdownStepMs)
        if (step >= AUTO.countdownSteps) {
          allGoodSince = null
          takePhoto('auto')
          return
        }
        countdown = AUTO.countdownSteps - step
      } else {
        allGoodSince = null
      }

      setLive({
        still,
        sensor: sensorStill !== null,
        tilt,
        sharp,
        bright,
        countdown,
      })
    }, 1000 / AUTO.analysisFps)

    return () => window.clearInterval(timer)
  }, [ready, hasPreview, error, takePhoto, viewport.width, viewport.height])

  const handleFallbackFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택할 수 있어요.')
      return
    }

    // 카메라 대체 파일 역시 빨간 박스 미리보기에서 조절할 수 있습니다.
    const url = URL.createObjectURL(file)
    const image = new Image()
    try {
      image.src = url
      await image.decode()
      if (!mountedRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      objectUrlsRef.current.add(url)
      setQuad(defaultQuad())
      setDetection('searching')
      setShot({
        file,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
        mode: 'file',
      })
    } catch {
      URL.revokeObjectURL(url)
      // 미리보기 디코딩을 지원하지 않아도 기존 파일 선택 기능은 유지합니다.
      if (mountedRef.current) onCapture(file)
    }
  }

  const retake = () => {
    if (shot) clearShotUrl(shot.url)
    dragRef.current = null
    capturingRef.current = false
    readyRef.current = false
    setShot(null)
    setQuad(defaultQuad())
    setDetection('searching')
    setReady(false)
    setVideoSize({ width: 0, height: 0 })
    setLive(EMPTY_LIVE)
    setCapturing(false)
    setLoading(true)
    setError(null)
  }

  const beginDrag = (mode: DragMode) => (event: PointerEvent<Element>) => {
    if (!shot || !viewport.width || !viewport.height) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: quad,
      width: viewport.width,
      height: viewport.height,
    }
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setQuad(
      dragQuad(
        drag.start,
        drag.mode,
        (event.clientX - drag.pointerX) / drag.width,
        (event.clientY - drag.pointerY) / drag.height,
      ),
    )
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const liveViewportReady =
    viewport.width > 0 && viewport.height > 0 &&
    videoSize.width > 0 && videoSize.height > 0
  const good = live.still === true && live.tilt !== 'low' && live.sharp && live.bright

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#24496B]">{title}</h3>
        <span className="text-[10px] text-[#8297AC]">
          {hasPreview ? '촬영 사진 확인' : '실시간 카메라'}
        </span>
      </div>

      <div
        ref={viewportRef}
        className="relative aspect-[3/4] max-h-[55dvh] w-full overflow-hidden rounded-2xl bg-[#142C40]"
      >
        {shot ? (
          <>
            <img
              src={shot.url}
              alt="촬영한 빗물받이 사진"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover"
            />
            {viewport.width > 0 && viewport.height > 0 && (
              <div
                className="absolute inset-0 select-none"
                style={{ touchAction: 'none' }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                aria-label="빗물받이 네 꼭짓점 조절"
              >
                <svg
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon
                    points={quadSvgPoints(quad)}
                    fill="rgba(239,68,68,0.10)"
                    stroke="#EF4444"
                    strokeWidth="6"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    style={{ cursor: 'move', touchAction: 'none' }}
                    onPointerDown={beginDrag('move')}
                  />
                </svg>
                {CORNERS.map((corner) => (
                  <div
                    key={corner}
                    className="absolute z-10 flex h-11 w-11 items-center justify-center"
                    style={{
                      left: `${quad[corner].x * 100}%`,
                      top: `${quad[corner].y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                    onPointerDown={beginDrag(corner)}
                  >
                    <span className="h-5 w-5 rounded border-[3px] border-red-500 bg-white shadow-md" />
                  </div>
                ))}
              </div>
            )}
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white">
              {shot.mode === 'auto' ? '자동 촬영' : shot.mode === 'manual' ? '수동 촬영' : '사진 선택'}
            </span>
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                const video = videoRef.current
                if (!video?.videoWidth || !video.videoHeight) return
                readyRef.current = true
                setReady(true)
                setVideoSize({ width: video.videoWidth, height: video.videoHeight })
              }}
              onResize={() => {
                const video = videoRef.current
                if (!video?.videoWidth || !video.videoHeight) return
                setVideoSize({ width: video.videoWidth, height: video.videoHeight })
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />

            {liveViewportReady && ready && !error && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute" style={boxStyle(GUIDE)}>
                  <GuideCorners good={good} />
                  {live.countdown > 0 && autoEnabled && (
                    <span className="absolute inset-0 flex items-center justify-center text-6xl font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                      {live.countdown}
                    </span>
                  )}
                </div>
              </div>
            )}

            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#142C40]/80">
                <p className="text-xs text-white">카메라를 실행하는 중...</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#142C40] p-5 text-center">
                <p role="alert" className="text-xs leading-relaxed text-white">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={retryCamera}
                  className="rounded-full bg-white px-5 py-2 text-xs font-bold text-[#24496B]"
                >
                  다시 시도
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {shot ? (
        <>
          <div className="rounded-xl bg-[#F4F7FC] px-3 py-3 text-xs leading-relaxed text-[#607C99]">
            <p className="font-semibold text-[#24496B]">
              {detection === 'searching'
                ? '빗물받이 사각 윤곽을 찾는 중이에요...'
                : detection === 'found'
                  ? '사각 윤곽 후보를 자동으로 표시했어요. 위치를 확인해 주세요.'
                  : '사각 윤곽을 확실히 찾지 못했어요. 네모를 직접 맞춰 주세요.'}
            </p>
            <p className="mt-1">빨간 네 꼭짓점을 각각 움직이거나, 네모 안을 끌어 전체 이동할 수 있어요.</p>
            <p className="mt-1 text-[11px]">미리보기는 화면에 맞춰 가장자리가 일부 잘려 보일 수 있어요. 서버에는 전체 사진이 전송되며 빨간 네모는 포함되지 않아요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDetection('searching')
                setDetectionAttempt((count) => count + 1)
              }}
              disabled={detection === 'searching'}
              className="rounded-full border border-[#CFE4F5] px-3 py-3 text-xs font-bold text-[#3489DC] disabled:opacity-40"
            >
              자동 윤곽 찾기
            </button>
            <button
              type="button"
              onClick={() => {
                setQuad(defaultQuad())
                setDetection('not-found')
              }}
              className="rounded-full border border-[#CFE4F5] px-3 py-3 text-xs font-bold text-[#3489DC]"
            >
              네모 초기화
            </button>
            <button
              type="button"
              onClick={retake}
              className="min-h-12 flex-1 rounded-full bg-[#EAF6FF] px-4 text-sm font-bold text-[#3489DC]"
            >
              다시 촬영
            </button>
            <button
              type="button"
              onClick={() => onCapture(shot.file)}
              className="min-h-12 flex-1 rounded-full bg-[#329BEC] px-4 text-sm font-bold text-white"
            >
              사진 사용
            </button>
          </div>
        </>
      ) : (
        <>
          {!error && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] leading-relaxed text-[#607C99]">
                  {ready ? hintText(live, autoEnabled) : '카메라를 준비하고 있어요.'}
                </p>
                <button
                  type="button"
                  aria-pressed={autoEnabled}
                  onClick={toggleAuto}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${
                    autoEnabled
                      ? 'bg-[#E6F5ED] text-[#25885C]'
                      : 'bg-[#EDF1F6] text-[#607C99]'
                  }`}
                >
                  자동 촬영 {autoEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {autoEnabled && (
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className={`rounded-full px-2 py-1 ${live.still ? 'bg-[#E6F5ED] text-[#25885C]' : 'bg-[#EDF1F6] text-[#607C99]'}`}>
                    {live.sensor ? '움직임 센서' : '영상 흔들림'} {live.still ? '✓' : '…'}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${live.tilt === 'low' ? 'bg-[#FFF1E8] text-[#C77D32]' : 'bg-[#EDF1F6] text-[#607C99]'}`}>
                    기울기 {live.tilt === 'unknown' ? '–' : live.tilt === 'ok' ? '✓' : '…'}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${live.sharp && live.bright ? 'bg-[#E6F5ED] text-[#25885C]' : 'bg-[#EDF1F6] text-[#607C99]'}`}>
                    선명도 {live.sharp && live.bright ? '✓' : '…'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={changeCamera}
                  className="min-h-12 rounded-full bg-[#EAF6FF] px-4 text-xs font-bold text-[#3489DC]"
                >
                  카메라 전환
                </button>
                <button
                  type="button"
                  onClick={() => takePhoto('manual')}
                  disabled={!ready || loading || capturing}
                  className="min-h-12 flex-1 rounded-full bg-[#329BEC] px-4 text-sm font-bold text-white disabled:opacity-40"
                >
                  {capturing ? '촬영 중...' : '수동 촬영'}
                </button>
              </div>
            </>
          )}
          {error && allowFileFallback && (
            <label className="block rounded-xl border border-[#CFE4F5] p-3 text-center text-xs font-bold text-[#3489DC]">
              카메라 대신 사진 선택
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void handleFallbackFile(event)}
                className="mt-2 block w-full text-xs"
              />
            </label>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-full bg-[#F1F6FB] p-3 text-xs font-semibold text-[#607C99]"
      >
        취소
      </button>
      <p className="text-center text-[10px] leading-relaxed text-[#9AAFC1]">
        사진 사용을 누르기 전까지 촬영된 이미지는 서버로 전송되지 않아요.
      </p>
    </div>
  )
}
