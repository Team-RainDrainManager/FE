import { REACTIONS } from './reactions'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getErrorMessage, getKakaoLoginUrl } from '../../apis/auth'
import { kakaoRedirectUri, markKakaoRedirect } from './auth-flow'

import Character from '../../components/common/Character'
import drainIcon from '../../assets/icons/drain.svg'
import mapIcon from '../../assets/icons/map.svg'
import bellIcon from '../../assets/icons/bell.svg'
import { useThemeStore } from '../../store/useThemeStore'
import { fetchSky, type SkyData } from '../../utils/sky'
import './LoginPage.css'
import ServerStatusNotice from '../../components/common/ServerStatusNotice'

const FEATURES = [
  { number: '01', title: '빗물받이 입양', detail: '우리 동네를 함께 돌봐요', icon: mapIcon },
  { number: '02', title: '간편한 점검', detail: '14일마다 사진으로 기록', icon: drainIcon },
  { number: '03', title: '비 예보 알림', detail: '비 오기 전에 미리 확인', icon: bellIcon },
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
type Reaction = (typeof REACTIONS)[number] & { id: number }

/** Chrome device emulation changes the mobile User-Agent, but generally retains
 * the physical desktop platform. Never try to launch the PC KakaoTalk app here.
 * iPadOS can report MacIntel, so account for a touch-capable iPad.
 */
function preferKakaoAccountOnThisDevice(): boolean {
  const platform = navigator.platform || ''
  const agent = navigator.userAgent || ''
  const looksLikeIPad = /Mac/i.test(platform) && navigator.maxTouchPoints > 1 && /Macintosh|iPad/i.test(agent)
  if (looksLikeIPad) return false
  if (/Win|Mac|Linux (?:x86|i686|x86_64)/i.test(platform)) return true
  return !/Android|iPhone|iPad|iPod/i.test(agent) && navigator.maxTouchPoints === 0
}

export default function LoginPage() {
  const location = useLocation()
  const [message, setMessage] = useState(() => {
    const state = location.state as { logoutNotice?: string } | null
    return state?.logoutNotice ?? ''
  })
  const [loginPending, setLoginPending] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const actionCount = useRef(0)
  const locationForWeather = useThemeStore(s => s.location)
  const [sky,setSky] = useState<SkyData|null>(null)
  const [weatherMessage,setWeatherMessage] = useState('')

  useEffect(() => {
    const controller=new AbortController()
    void fetchSky(locationForWeather.latitude,locationForWeather.longitude,controller.signal)
      .then(data=>{setSky(data);setWeatherMessage('')})
      .catch(()=>{if(!controller.signal.aborted)setWeatherMessage('현재 날씨를 불러오지 못했습니다.')})
    return ()=>controller.abort()
  },[locationForWeather.latitude,locationForWeather.longitude])


  useEffect(() => {
    if (!reaction) return
    const timeoutId = window.setTimeout(() => setReaction(null), 1250)
    return () => window.clearTimeout(timeoutId)
  }, [reaction])

  const handleCharacterClick = () => {
    const index = actionCount.current++
    setReaction({ ...REACTIONS[index % REACTIONS.length], id: index })
  }

  const handleKakaoLogin = async (mode: 'auto' | 'account' = 'auto') => {
    setMessage('')
    setLoginPending(true)
    try {
      const loginUrl = await getKakaoLoginUrl(kakaoRedirectUri())
      const url = new URL(loginUrl)
      if (url.protocol !== 'https:' || url.hostname !== 'kauth.kakao.com') {
        throw new Error('카카오 로그인 주소가 올바르지 않습니다.')
      }
      // PC 및 계정 로그인 선택 시에는 앱 호출 대신 카카오계정 웹 로그인을 사용합니다.
      if (mode === 'account' || preferKakaoAccountOnThisDevice()) {
        url.searchParams.set('prompt', 'login')
      }
      markKakaoRedirect()
      window.location.assign(url.href)
    } catch (err: unknown) {
      setMessage(getErrorMessage(err))
      setLoginPending(false)
    }
  }

  return (
    <div className="dd-login-viewport">
      <main className={`dd-login ${sky ? sky.rain ? 'dd-login--rain' : sky.weatherCode<=2 ? 'dd-login--sun' : 'dd-login--cloud' : 'dd-login--cloud'}`} aria-label="또랑 로그인">
        <div className="dd-login-rain" aria-hidden="true">
          {(!sky || sky.rain) && RAIN_DROPS.map((drop) => (
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
          <p className="dd-login-weather" role="status">{sky ? `${sky.rain?'☔ 비 오는 중':sky.weatherCode<=2?'☀ 맑음':'☁ 흐림'}${sky.temperature===null?'':` · ${Math.round(sky.temperature)}°C`} · ${locationForWeather.latitude===37.487?'역곡 인근':'선택한 위치'} 기준` : weatherMessage||'지역 날씨 확인 중…'}</p>
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
            <span className="dd-login-character-tip" aria-hidden="true">
              또랑이를 살짝 눌러보세요!
            </span>
          </button>
        </section>

        <section className="dd-login-features" aria-label="또랑 서비스 이용 방법">
          <h2>또랑이와 함께하는 3단계</h2>
          <div className="dd-login-features-grid">
            {FEATURES.map(({ number, title, detail, icon }) => (
              <div className="dd-login-feature" key={number}>
                <span className="dd-login-feature-illustration" aria-hidden="true"><img src={icon} alt="" /></span>
                <span className="dd-login-feature-number">{number}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
        </section>

        <footer className="dd-login-footer">
          <ServerStatusNotice className="dd-login-message" />
          <button type="button" onClick={() => { void handleKakaoLogin() }} disabled={loginPending} className="dd-login-kakao-button">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="dd-login-kakao-icon">
              <path d="M12 3C6.75 3 2.5 6.38 2.5 10.55c0 2.64 1.72 4.97 4.32 6.32l-.87 3.67a.5.5 0 0 0 .73.54l4.18-2.45c.37.04.75.06 1.14.06 5.25 0 9.5-3.38 9.5-7.55S17.25 3 12 3Z" />
            </svg>
            {loginPending ? '카카오 로그인 연결 중…' : preferKakaoAccountOnThisDevice() ? '카카오계정으로 시작하기' : '카카오로 시작하기'}
          </button>
          {!preferKakaoAccountOnThisDevice() && (
            <button
              type="button"
              disabled={loginPending}
              onClick={() => { void handleKakaoLogin('account') }}
              className="mt-2 w-full rounded-xl py-2 text-center text-xs font-medium text-[#667A92] underline-offset-4 hover:underline disabled:opacity-50"
            >
              카카오톡 앱 연결이 안 되시나요? 카카오계정으로 로그인
            </button>
          )}
          <nav className="dd-login-email-links" aria-label="이메일 계정">
            <Link to="/login/email">이메일 로그인</Link>
            <span aria-hidden="true">·</span>
            <Link to="/signup">이메일 회원가입</Link>
          </nav>
          <p>함께 돌보고, 함께 지키는 우리 동네</p>
          {message && <div className="dd-login-message" role="status">{message}</div>}
        </footer>
      </main>
    </div>
  )
}
