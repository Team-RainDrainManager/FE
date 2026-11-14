import { useEffect, useState } from 'react'

import Character from '../../../components/common/Character'
import { getLevelCharacter } from '../../../constants/characters'
import { drainCategory, type DrainMapItem } from '../../../types/map'
import { REACTIONS } from '../../login/reactions'
import '../../login/LoginPage.css'
import '../map-dark.css'

export default function FloatingDrainCharacter({ drain, bubbleColor, badge }: {
  drain: DrainMapItem
  bubbleColor: string
  badge: React.ReactNode
}) {
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reaction = REACTIONS[(Math.max(tick, 1) - 1) % REACTIONS.length]
  const unadopted = drainCategory(drain) === 'unadopted'
  const image = getLevelCharacter(unadopted ? 0 : Math.max(1, drain.level ?? 1))

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setPlaying(false), 1250)
    return () => window.clearTimeout(timer)
  }, [tick, playing])

  return (
    <div className="dd-map-overlay dd-selected-character">
      <span aria-hidden="true" className={`drain-bubble ${bubbleColor}`} />
      {badge}
      {playing && <span className="drain-whisper dd-float-whisper">{reaction.text}</span>}
      <button
        type="button"
        onClick={() => { setTick((t) => t + 1); setPlaying(true) }}
        aria-label={`${drain.nickname ?? drain.name} 캐릭터, 누르면 반응해요`}
        className="dd-float-body block"
      >
        <span key={tick} className={`block ${playing ? `dd-login-character-action--${reaction.motion}` : ''}`}>
          {playing ? (
            <Character type="state" state={reaction.face} size={360} alt="" />
          ) : (
            <img src={image} alt="" width={360} height={360} draggable={false} className="block h-[360px] w-[360px]" />
          )}
        </span>
      </button>
    </div>
  )
}
