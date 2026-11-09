import { useEffect, useRef } from 'react'

type Props = {
  file: File
  alt: string
}

/** 촬영을 마친 사진을 폼에서 보여 줍니다. 서버로 가는 잘린 사진 그대로라 전부 보이게 합니다. */
export default function CapturedPreview({ file, alt }: Props) {
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    const url = URL.createObjectURL(file)
    if (image) image.src = url
    return () => {
      if (image) image.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file])

  return (
    <img
      ref={imageRef}
      alt={alt}
      className="max-h-52 w-full rounded-xl bg-[#142C40] object-contain"
    />
  )
}
