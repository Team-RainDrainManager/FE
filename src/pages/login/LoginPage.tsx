import { useState } from 'react'

import Character from '../../components/common/Character'

const FEATURES = [
  { number: '01', title: '우리 동네 빗물받이 입양', detail: '매일 지나는 길을 함께 돌봐요.' },
  { number: '02', title: '14일마다 간편 점검', detail: '사진으로 관리 기록을 남겨요.' },
  { number: '03', title: '비 오기 전 미리 알림', detail: '놓치지 않도록 점검을 알려드려요.' },
]

export default function LoginPage() {
  const [message, setMessage] = useState('')

  const handleKakaoLogin = () => {
    // 실제 로그인 주소는 백엔드 담당자에게 받은 뒤 .env에 설정합니다.
    // 주소가 없는 동안에는 실제로 로그인된 것처럼 처리하지 않습니다.
    const loginUrl = import.meta.env.VITE_KAKAO_LOGIN_URL?.trim()

    if (!loginUrl) {
      setMessage('카카오 로그인은 아직 서버와 연결되지 않았습니다. 화면만 미리 확인할 수 있습니다.')
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
    <div className="min-h-dvh bg-[#F5FAFF] text-[#24496B]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-gradient-to-b from-[#EAF6FF] via-[#F8FBFF] to-white px-6 shadow-sm">
        <header className="flex items-center gap-2 pt-10">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-[#338CF0] text-xl font-bold text-white">
            물
          </span>
          <span className="text-xl font-extrabold tracking-[-0.04em]">또랑</span>
        </header>

        <section className="pt-14 text-center">
          <p className="text-xs font-bold tracking-[0.12em] text-[#338CF0]">우리 동네 빗물받이 돌봄</p>
          <h1 className="mt-4 text-[29px] font-extrabold leading-[1.35] tracking-[-0.055em]">
            비 오기 전, 함께 돌보는<br />
            <span className="text-[#338CF0]">우리 동네 또랑이</span>
          </h1>
          <p className="mt-4 text-[13px] leading-6 text-[#7C90A8]">
            작은 관심 하나가 동네의 침수를 막는 시작이 됩니다.
          </p>
        </section>

        <section aria-label="또랑이 캐릭터" className="relative flex min-h-[220px] flex-1 items-center justify-center py-8">
          <div aria-hidden="true" className="absolute size-[210px] rounded-full bg-[#DBEFFF]" />
          <div aria-hidden="true" className="absolute left-[14%] top-[23%] size-3 rounded-full bg-[#AED9FF]" />
          <div aria-hidden="true" className="absolute right-[12%] bottom-[25%] size-2 rounded-full bg-[#82C4FF]" />
          <Character type="state" state="happy" size={205} className="relative z-10 drop-shadow-md" />
        </section>

        <section className="rounded-[22px] border border-[#E3EEF9] bg-white/95 px-5 py-5 shadow-[0_8px_30px_rgba(41,105,162,0.06)]">
          <h2 className="mb-4 text-sm font-extrabold">또랑에서는 이렇게 함께해요</h2>
          <div className="space-y-4">
            {FEATURES.map(({ number, title, detail }) => (
              <div key={number} className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EDF7FF] text-[11px] font-extrabold text-[#338CF0]">
                  {number}
                </span>
                <div>
                  <p className="text-[13px] font-bold">{title}</p>
                  <p className="mt-0.5 text-[11px] text-[#8193AA]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pb-[calc(28px+env(safe-area-inset-bottom))] pt-6">
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#FEE500] px-5 text-[15px] font-bold text-[#191919] transition-colors hover:bg-[#FADA00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#338CF0]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M12 3C6.75 3 2.5 6.38 2.5 10.55c0 2.64 1.72 4.97 4.32 6.32l-.87 3.67a.5.5 0 0 0 .73.54l4.18-2.45c.37.04.75.06 1.14.06 5.25 0 9.5-3.38 9.5-7.55S17.25 3 12 3Z" />
            </svg>
            카카오로 시작하기
          </button>
          {message && (
            <p role="status" className="mt-3 rounded-xl bg-[#EDF7FF] px-3 py-3 text-center text-xs leading-5 text-[#34668F]">
              {message}
            </p>
          )}
          <p className="mt-4 text-center text-[11px] text-[#95A5B8]">
            함께 돌보고, 함께 지키는 우리 동네
          </p>
        </div>
      </main>
    </div>
  )
}
