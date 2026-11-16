import type { ReactNode } from 'react'
import './speech-bubble.css'

type Props = {
  children: ReactNode
  animate?: boolean
  login?: boolean
  tail?: 'down' | 'down-left' | 'down-right'
}

export default function SpeechBubble({ children, animate = false, login = false, tail = 'down' }: Props) {
  const path = tail === 'down'
    ? 'M28 3 Q68 0 131 3 C149 4 158 11 158 25 Q158 45 134 47 Q111 49 90 48 Q82 51 80 58 Q75 54 72 48 Q48 49 26 47 C8 46 2 38 2 25 Q2 5 28 3Z'
    : 'M28 3 Q68 0 131 3 C149 4 158 11 158 25 Q158 45 134 47 Q84 50 38 47 Q25 54 8 58 Q17 51 19 45 C7 42 2 35 2 25 Q2 5 28 3Z'
  return (
    <span className="dd-talk" data-enter={animate || undefined} data-tail={tail}>
      <svg aria-hidden="true" viewBox="0 0 160 60" preserveAspectRatio="none">
        <path d={login ? 'M33 3 C56 1 106 1 131 3 C149 4 158 10 158 24 C158 39 148 46 132 47 C102 50 56 49 35 47 Q25 55 13 57 Q20 50 20 45 C8 42 2 35 2 25 C2 11 14 4 33 3Z' : path} vectorEffect="non-scaling-stroke" />
      </svg>
      <span>{children}</span>
    </span>
  )
}
