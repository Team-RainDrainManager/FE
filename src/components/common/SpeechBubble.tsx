import type { ReactNode } from 'react'
import './speech-bubble.css'

export default function SpeechBubble({ children, animate = false, tailRight = false, tailCentered = false }: {
  children: ReactNode
  animate?: boolean
  tailCentered?: boolean
  tailRight?: boolean
}) {
  return (
    <span className="dd-talk" data-enter={animate || undefined} data-tail-right={tailRight || undefined}>
      <svg aria-hidden="true" viewBox="0 0 160 60" preserveAspectRatio="none">
        <path d={tailCentered
          ? "M80 2 C130 2 158 7 158 25 C158 42 131 48 88 48 Q82 52 80 60 Q76 55 73 48 C28 48 2 42 2 25 C2 9 29 2 80 2Z"
          : "M80 2 C130 2 158 7 158 25 C158 41 135 48 83 48 Q72 48 63 47 Q48 58 29 58 Q41 52 43 45 C14 42 2 36 2 25 C2 9 29 2 80 2Z"}
          vectorEffect="non-scaling-stroke" />
      </svg>
      <span>{children}</span>
    </span>
  )
}
