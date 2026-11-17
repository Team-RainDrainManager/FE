import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Character from './common/Character'
import { finishFirstRun, hasPendingTour } from '../utils/firstRun'

type TourTarget = 'welcome' | 'map' | 'my-drains' | 'notifications' | 'social' | 'profile'

type TourStep = {
  path: string
  target: TourTarget
  label: string
  title: string
  description: string
  growthTips?: readonly string[]
}

const TOUR_STEPS: readonly TourStep[] = [
  {
    path: '/map', target: 'welcome', label: '환영',
    title: '또랑에 오신 걸 환영합니다!',
    description: '우리 동네 빗물받이를 돌보는 방법과 새로 생긴 기능을 짧게 소개해 드릴게요.',
  },
  {
    path: '/map', target: 'map', label: '지도',
    title: '지도에서 우리 동네 또랑이를 찾으세요',
    description: '검색과 상태 필터로 빗물받이를 찾고, 현황을 살피거나 문제가 있다면 제보할 수 있어요.',
  },
  {
    path: '/map', target: 'map', label: '빗물받이 목록',
    title: '목록에서 빗물받이를 찾아보세요',
    description: '지도에서 빗물받이 목록을 열면 검색과 필터에 맞는 결과가 나와요. 항목을 누르면 해당 빗물받이를 선택해요.',
  },
  {
    path: '/my-drains', target: 'my-drains', label: '또랑이',
    title: '돌볼수록 성장하는 또랑이!',
    description: '입양한 또랑이의 성장과 점검 기록이 모여요. 처음 입양 수가 0개인 것은 정상이에요.',
    growthTips: [
      '레벨이 올라갈수록 또랑이의 모습이 달라져요.',
      '또랑이를 터치하면 성장 단계에 따라 새로운 대사를 볼 수 있어요.',
      '미입양 또랑이는 통통 뛰어요. 입양 후 1·3·5·7레벨에 춤을 하나씩 배우고 10레벨에는 한 바퀴 돌아요.',
      '꾸준히 돌보며 또랑이와 친해져 보세요!',
    ],
  },
  {
    path: '/my-drains', target: 'my-drains', label: '성장 도감',
    title: '또랑이의 성장 모습을 살펴보세요',
    description: '성장 도감에서 현재 레벨과 지나온 모습을 확인하세요. 흑백으로 표시된 미해금 단계도 눌러서 크게 볼 수 있어요.',
  },
  {
    path: '/social', target: 'social', label: '랭킹',
    title: '이번 주 내 기록과 순위를 확인하세요',
    description: '내 주간 기록에서 점수와 순위를 확인하세요. 전체 TOP 3 아래의 주간 랭킹 요약에서 전체 랭킹을 열 수 있어요.',
  },
  {
    path: '/social', target: 'social', label: '친구 초대',
    title: '친구에게 또랑 링크를 보내세요',
    description: '화면 오른쪽 위의 친구 초대 아이콘을 누르고 초대 링크 공유하기를 선택하세요. 기기에 따라 공유창이 열리거나 링크가 복사돼요.',
  },
  {
    path: '/notifications', target: 'notifications', label: '알림',
    title: '점검 요청과 활동 소식을 확인하세요',
    description: '새 알림이 있으면 아래 종 아이콘에서 확인할 수 있어요. 알림 탭에서 점검 요청과 소식을 살펴보세요.',
  },
  {
    path: '/profile', target: 'profile', label: '프로필',
    title: '내 기록과 닉네임을 관리하세요',
    description: '활동 기록과 입양 현황을 볼 수 있고, 프로필에서 닉네임을 변경하거나 설정을 열 수 있어요.',
  },
]

// 경로를 바꾸는 동안 MainLayout이 다시 렌더되거나 재마운트돼도 진행 상태를 유지합니다.
const TOUR_STEP_KEY = 'ddorang:first-tour-step'

function readTourStep(): number {
  try {
    const value = Number(sessionStorage.getItem(TOUR_STEP_KEY) ?? '0')
    return Number.isInteger(value) && value >= 0 && value < TOUR_STEPS.length ? value : 0
  } catch {
    return 0
  }
}

function saveTourStep(nextStep: number) {
  try {
    sessionStorage.setItem(TOUR_STEP_KEY, String(nextStep))
  } catch {
    // 사생활 보호 모드에서도 현재 페이지에서는 튜토리얼을 진행할 수 있습니다.
  }
}

function clearTourStep() {
  try {
    sessionStorage.removeItem(TOUR_STEP_KEY)
  } catch {
    // 저장 공간을 사용할 수 없는 환경에서는 무시합니다.
  }
}

export default function FirstTimeTour() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [step, setStep] = useState(readTourStep)
  const [open, setOpen] = useState(hasPendingTour)
  const current = TOUR_STEPS[step]

  useEffect(() => {
    if (!open) return
    // 하단 탭의 강조 스타일만 바꿉니다. 경로 변경은 클릭할 때만 합니다.
    document.documentElement.dataset.ddTourTarget = current.target
    return () => {
      delete document.documentElement.dataset.ddTourTarget
    }
  }, [current.target, open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finishFirstRun()
        clearTourStep()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    finishFirstRun()
    clearTourStep()
    setOpen(false)
  }

  function moveTo(nextStep: number) {
    // 저장을 먼저 해야 탭 이동 중 컴포넌트가 재마운트돼도 1단계로 돌아가지 않습니다.
    saveTourStep(nextStep)
    setStep(nextStep)
    const nextPath = TOUR_STEPS[nextStep].path
    if (pathname !== nextPath) navigate(nextPath, { replace: true })
  }

  function next() {
    if (step === TOUR_STEPS.length - 1) close()
    else moveTo(step + 1)
  }

  if (!open) return null

  return (
    <aside className="dd-tour-bubble" data-tour-tab={current.target} role="dialog" aria-label="또랑 첫 사용 안내">
      <div className="dd-tour-bubble-header">
        <span className="dd-tour-kicker">또랑이의 첫 사용 안내 <span>{step + 1} / {TOUR_STEPS.length}</span></span>
        <button type="button" className="dd-tour-skip" onClick={close}>건너뛰기</button>
      </div>
      <div className="dd-tour-bubble-content" aria-live="polite">
        <div className="dd-tour-bubble-character" aria-hidden="true">
          <Character type="state" state={step === 0 ? 'joy' : 'happy'} size={62} />
        </div>
        <div className="dd-tour-bubble-text">
          <span className="dd-tour-bubble-label">{current.label} 안내</span>
          <h2>{current.title}</h2>
          <p>{current.description}</p>
          {current.growthTips?.map((tip) => <p key={tip}>{tip}</p>)}
        </div>
      </div>
      <div className="dd-tour-bubble-footer">
        <div className="dd-tour-mini-dots" aria-hidden="true">
          {TOUR_STEPS.map((_, index) => (
            <span key={index} className={index === step ? 'active' : ''} />
          ))}
        </div>
        <div className="dd-tour-bubble-actions">
          {step > 0 && <button type="button" className="dd-tour-previous" onClick={() => moveTo(step - 1)}>이전</button>}
          <button type="button" className="dd-tour-next" onClick={next}>
            {step === TOUR_STEPS.length - 1 ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </aside>
  )
}
