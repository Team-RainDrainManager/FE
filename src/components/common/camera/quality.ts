import type { Box } from './box'

// 사진 품질을 픽셀 계산만으로 잽니다.

export function toGray(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4)
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    gray[i] = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]
  }
  return gray
}

/** 선명도: 라플라시안 분산. 흐리면 작아집니다. */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
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
      count++
    }
  }
  if (!count) return 0
  const mean = sum / count
  return sumSquared / count - mean * mean
}

/** 밝기: 0(검정)~255(흰색) 평균 */
export function meanOf(gray: Float32Array): number {
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  return gray.length ? sum / gray.length : 0
}

/** 두 프레임의 평균 밝기 차이. 폰이나 장면이 움직이면 커집니다. */
export function meanAbsDiff(previous: Float32Array, current: Float32Array): number {
  if (previous.length !== current.length || !current.length) return 255
  let sum = 0
  for (let i = 0; i < current.length; i++) sum += Math.abs(previous[i] - current[i])
  return sum / current.length
}

/** 원본의 box 영역을 targetWidth 폭으로 줄여 흑백으로 읽습니다. */
export function sampleRegion(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: Box,
  targetWidth: number,
  canvas: HTMLCanvasElement,
) {
  const sx = box.x * sourceWidth
  const sy = box.y * sourceHeight
  const sw = Math.max(1, box.w * sourceWidth)
  const sh = Math.max(1, box.h * sourceHeight)
  const width = Math.max(8, Math.round(targetWidth))
  const height = Math.max(8, Math.round((targetWidth * sh) / sw))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return { gray: new Float32Array(0), width, height }
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height)
  return { gray: toGray(context.getImageData(0, 0, width, height).data), width, height }
}

export function assessPhoto(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  box: Box,
  targetWidth: number,
) {
  const { gray, width, height } = sampleRegion(
    source,
    sourceWidth,
    sourceHeight,
    box,
    targetWidth,
    document.createElement('canvas'),
  )
  return { sharpness: laplacianVariance(gray, width, height), brightness: meanOf(gray) }
}
