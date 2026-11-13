import { useEffect, useState } from 'react'

import Character from '../../../components/common/Character'
import { getLevelCharacter } from '../../../constants/characters'
import { drainCategory, type DrainMapItem } from '../../../types/map'
import { REACTIONS } from '../../login/reactions'
import '../../login/LoginPage.css'
import '../map-dark.css'

/**
 * 빗물받이를 눌렀을 때 정보 카드 위에 둥둥 떠 있는 그 빗물받이의 캐릭터 (원 없이).
 * 입양된 빗물받이는 레벨 캐릭터, 입양 안 된 빗물받이는 입양 전 캐릭터입니다. 누르면 한 번씩 반응합니다.
 */
export default function FloatingDrainCharacter({ drain }: { drain: DrainMapItem }) {
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
    <div className="dd-float pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2">
      {playing && <span className="drain-whisper dd-float-whisper">{reaction.text}</span>}
      <button
        type="button"
        onClick={() => { setTick((t) => t + 1); setPlaying(true) }}
        aria-label={`${drain.nickname ?? drain.name} 캐릭터, 누르면 반응해요`}
        className="dd-float-body pointer-events-auto block"
      >
        <span key={tick} className={`block ${playing ? `dd-login-character-action--${reaction.motion}` : ''}`}>
          {playing ? (
            <Character type="state" state={reaction.face} size={120} alt="" />
          ) : (
            <img src={image} alt="" width={120} height={120} draggable={false} className="block h-[120px] w-[120px]" />
          )}
        </span>
      </button>
    </div>
  )
}
