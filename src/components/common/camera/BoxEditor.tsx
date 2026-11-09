import { useRef, type PointerEvent } from 'react'

import { boxStyle, containRect, dragBox, expandBox, type Box, type DragMode } from './box'
import { CAMERA } from './config'
import { useElementSize } from './useElementSize'

type Props = {
  src: string
  imageWidth: number
  imageHeight: number
  box: Box
  onChange: (box: Box) => void
  className?: string
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']

/** 사진 위에 빨간 박스(덮개)와 흰 점선(서버로 보내는 범위)을 겹쳐 보여 줍니다. 촬영기 앱과 같은 동작입니다. */
export default function BoxEditor({
  src,
  imageWidth,
  imageHeight,
  box,
  onChange,
  className = '',
}: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const rect = containRect(size.width, size.height, imageWidth, imageHeight)
  const drag = useRef<{
    mode: DragMode
    x: number
    y: number
    start: Box
    width: number
    height: number
  } | null>(null)

  const begin = (mode: DragMode, event: PointerEvent<HTMLDivElement>) => {
    if (!rect) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      start: box,
      width: rect.width,
      height: rect.height,
    }
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    onChange(
      dragBox(
        current.start,
        current.mode,
        (event.clientX - current.x) / current.width,
        (event.clientY - current.y) / current.height,
      ),
    )
  }

  const end = () => {
    drag.current = null
  }

  return (
    <div ref={ref} className={`relative overflow-hidden bg-black ${className}`}>
      {rect && (
        <div
          className="absolute"
          style={{ ...rect, touchAction: 'none' }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <img
            src={src}
            alt="촬영한 빗물받이 사진"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
          />
          <div
            className="pointer-events-none absolute border-2 border-dashed border-white"
            style={{
              ...boxStyle(expandBox(box, CAMERA.contextPadding)),
              boxShadow: '0 0 0 1px rgba(0,0,0,0.45)',
            }}
          />
          <div
            aria-label="빨간 박스. 끌어서 옮기기"
            className="absolute cursor-move border-[3px] border-red-600"
            style={{ ...boxStyle(box), boxShadow: '0 0 0 1px rgba(255,255,255,0.7)' }}
            onPointerDown={(event) => begin({ move: true }, event)}
          >
            {CORNERS.map((corner) => (
              <div
                key={corner}
                className="absolute flex h-11 w-11 items-center justify-center"
                style={{
                  left: corner.endsWith('w') ? -22 : undefined,
                  right: corner.endsWith('e') ? -22 : undefined,
                  top: corner.startsWith('n') ? -22 : undefined,
                  bottom: corner.startsWith('s') ? -22 : undefined,
                  cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onPointerDown={(event) =>
                  begin(
                    {
                      move: false,
                      n: corner.startsWith('n'),
                      s: corner.startsWith('s'),
                      w: corner.endsWith('w'),
                      e: corner.endsWith('e'),
                    },
                    event,
                  )
                }
              >
                <div className="h-5 w-5 rounded-sm border-[3px] border-red-600 bg-white" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
