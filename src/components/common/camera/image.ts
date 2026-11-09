import { CAMERA } from './config'

/** 다시 보내기엔 너무 오래된 사진인지 확인합니다. */
export function isPhotoStale(file: File): boolean {
  return Date.now() - file.lastModified > CAMERA.photoMaxAgeMs
}

export const STALE_PHOTO_MESSAGE = '찍은 지 오래된 사진이에요. 빗물받이 앞에서 다시 찍어 주세요.'

/** 원본을 긴 변 maxLongEdge 이하로 줄여 새 캔버스에 그립니다. */
export function drawScaled(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sourceWidth * scale)
  canvas.height = Math.round(sourceHeight * scale)
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('사진을 만들지 못했어요.'))),
      'image/jpeg',
      CAMERA.upload.jpegQuality,
    )
  })
}

/** 기본 카메라 앱으로 찍은 사진을 캔버스로 읽습니다. 사진 방향은 브라우저가 맞춰 줍니다. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('사진을 읽지 못했어요.'))
      element.src = url
    })
    return drawScaled(image, image.naturalWidth, image.naturalHeight, CAMERA.maxLongEdge)
  } finally {
    URL.revokeObjectURL(url)
  }
}
