import { useEffect, useRef, useState } from 'react'
import { getCharacterGrowth, getGrowthDance, type GrowthDance } from '../../constants/characterGrowth'
import { getLevelCharacter } from '../../constants/characters'
import Character from './Character'
import '../../pages/login/LoginPage.css'
import './character-growth.css'

// 세 문구 모두 읽을 수 있도록 한 번의 터치 반응을 4.8초로 유지합니다.
const LINE_DURATION_MS = 1600

type Reaction = { text: string; dance: GrowthDance | null }
type Props = {
  level: number
  name: string
  size: number
  variant: 'card' | 'map'
  canReact?: boolean
}

export default function GrowthReactionButton({ level, name, size, variant, canReact = true }: Props) {
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const timerIds = useRef<number[]>([])
  const nextDance = useRef(0)

  useEffect(() => () => {
    timerIds.current.forEach((id) => window.clearTimeout(id))
    timerIds.current = []
  }, [])

  function play() {
    // 반응 중에는 새로운 반응을 겹쳐 재생하지 않습니다.
    if (!canReact || timerIds.current.length > 0) return
    const stage = getCharacterGrowth(level)
    const dance = getGrowthDance(level, nextDance.current)
    if (dance !== null) nextDance.current = (nextDance.current + 1) % stage.dances
    const [first, second, third] = stage.lines
    setReaction({ text: first, dance })
    timerIds.current = [
      window.setTimeout(() => setReaction({ text: second, dance }), LINE_DURATION_MS),
      window.setTimeout(() => setReaction({ text: third, dance }), LINE_DURATION_MS * 2),
      window.setTimeout(() => {
        timerIds.current = []
        setReaction(null)
      }, LINE_DURATION_MS * 3),
    ]
  }

  const isMap = variant === 'map'
  return (
    <>
      <button
        type="button"
        onClick={play}
        aria-label={`${name} 캐릭터, 누르면 반응해요`}
        aria-disabled={!canReact || reaction !== null}
        className={`dd-growth-button${isMap ? ' dd-float-body pointer-events-auto block' : ' dd-growth-card-button'}${reaction ? ' dd-growth-playing' : ''}`}
      >
        <span className={`dd-growth-action${reaction?.dance ? ` dd-growth-action--${reaction.dance}` : ''}`}>
          {isMap ? (
            <img src={getLevelCharacter(level)} alt="" width={size} height={size} draggable={false} className="block" />
          ) : (
            <Character type="level" level={level} size={size} alt="" />
          )}
        </span>
      </button>
      {reaction && (
        <span role="status" aria-live="polite" className={`dd-growth-speech dd-growth-speech--${variant}`}>
          {reaction.text}
        </span>
      )}
    </>
  )
}
