import { useEffect, useRef, useState } from 'react'

import Character from '../../components/common/Character'
import './LoginPage.css'

const FEATURES = [
  { number: '01', title: '빗물받이 입양', detail: '우리 동네를 함께 돌봐요' },
  { number: '02', title: '간편한 점검', detail: '14일마다 사진으로 기록' },
  { number: '03', title: '비 예보 알림', detail: '비 오기 전에 미리 확인' },
]

// 고정된 값으로 비를 생성해 버튼을 누르더라도 빗방울의 위치가 갑자기 바뀌지 않습니다.
const RAIN_DROPS = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: `${(index * 43 + 13) % 100}%`,
  duration: `${1.7 + (index % 7) * 0.21}s`,
  delay: `${-((index * 19) % 47) / 10}s`,
  opacity: 0.13 + (index % 4) * 0.05,
}))

// 터치할 때마다 동작과 표정이 달라집니다. (기존 캐릭터 SVG 사용)
const REACTIONS = [
  { motion: 'superjump', face: 'joy', text: '짜잔! 나 불렀어?' },
  { motion: 'wiggle', face: 'wink', text: '헤헤, 또 놀자!' },
  { motion: 'spin', face: 'surprised', text: '앗! 간지러워!' },
  { motion: 'dance', face: 'proud', text: '내 춤 어때?' },
] as const

type Reaction = (typeof REACTIONS)[number] & { id: number }

export default function LoginPage() {
  const [message, setMessage] = useState('')
  const [hovered, setHovered] = useState(false)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const actionCount = useRef(0)

  useEffect(() => {
    if (!reaction) return
    const timeoutId = window.setTimeout(() => setReaction(null), 1250)
    return () => window.clearTimeout(timeoutId)
  }, [reaction])

  const handleCharacterClick = () => {
    const index = actionCount.current++
    setReaction({ ...REACTIONS[index % REACTIONS.length], id: index })
  }

  const handleKakaoLogin = () => {
    const loginUrl = import.meta.env.VITE_KAKAO_LOGIN_URL?.trim()

    if (!loginUrl) {
      setMessage('카카오 로그인은 아직 서버와 연결되지 않았습니다.')
      return
    }

    try {
      const url = new URL(loginUrl, window.location.origin)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Invalid login URL')
      }
      window.location.assign(url.href)
    } catch {
      setMessage('로그인 주소 설정을 확인해주세요.')
    }
  }

  return (
    <div className="dd-login-viewport">
      <main className="dd-login" aria-label="또랑 로그인">
        <div className="dd-login-rain" aria-hidden="true">
          {RAIN_DROPS.map((drop) => (
            <span
              key={drop.id}
              className="dd-login-raindrop"
              style={{
                left: drop.left,
                animationDuration: drop.duration,
                animationDelay: drop.delay,
                opacity: drop.opacity,
              }}
            />
          ))}
        </div>

        <header className="dd-login-intro">
          <p className="dd-login-kicker">우리 동네 빗물받이 돌봄</p>
          <h1>
            비 오기 전, 함께 돌보는
            <span>우리 동네 또랑이</span>
          </h1>
          <p className="dd-login-subtitle">작은 관심 하나가 동네의 침수를 막는 시작이 됩니다.</p>
        </header>

        <section className="dd-login-character-stage" aria-label="또랑이와 놀기">
          <button
            type="button"
            className="dd-login-character-button"
            aria-label="또랑이를 눌러서 반응 보기"
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') setHovered(true)
            }}
            onPointerLeave={() => setHovered(false)}
            onClick={handleCharacterClick}
          >
            <span className="dd-login-character-entrance">
              <span
                key={reaction?.id ?? 'idle'}
                className={`dd-login-character-action ${
                  reaction ? `dd-login-character-action--${reaction.motion}` : 'dd-login-character-action--idle'
                }`}
              >
                <Character
                  type="state"
                  state={reaction?.face ?? (hovered ? 'joy' : 'happy')}
                  size={220}
                  className="dd-login-character-image"
                  alt=""
                />
                {!reaction && !hovered && (
                  <Character
                    type="state"
                    state="wink"
                    size={220}
                    className="dd-login-character-image dd-login-character-auto-wink"
                    alt=""
                  />
                )}
              </span>
            </span>
            <span className={`dd-login-character-speech${reaction || hovered ? ' is-visible' : ''}`} aria-hidden="true">
              {reaction?.text ?? '나랑 놀자!'}
            </span>
            <span className="dd-login-character-sparkles" aria-hidden="true">
              <span>✦</span><span>✧</span><span>✦</span>
            </span>
          </button>
          <p className="dd-login-character-hint">또랑이를 살짝 눌러보세요!</p>
        </section>

        <section className="dd-login-features" aria-label="또랑 서비스 이용 방법">
          <h2>또랑이와 함께하는 3단계</h2>
          <div className="dd-login-features-grid">
            {FEATURES.map(({ number, title, detail }) => (
              <div className="dd-login-feature" key={number}>
                <span className="dd-login-feature-number">{number}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
        </section>

        <footer className="dd-login-footer">
          <button type="button" onClick={handleKakaoLogin} className="dd-login-kakao-button">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="dd-login-kakao-icon">
              <path d="M12 3C6.75 3 2.5 6.38 2.5 10.55c0 2.64 1.72 4.97 4.32 6.32l-.87 3.67a.5.5 0 0 0 .73.54l4.18-2.45c.37.04.75.06 1.14.06 5.25 0 9.5-3.38 9.5-7.55S17.25 3 12 3Z" />
            </svg>
            카카오로 시작하기
          </button>
          <p>함께 돌보고, 함께 지키는 우리 동네</p>
          {message && <div className="dd-login-message" role="status">{message}</div>}
        </footer>
      </main>
    </div>
  )
}
