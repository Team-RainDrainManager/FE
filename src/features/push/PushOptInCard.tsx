import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getErrorMessage } from '../../apis/auth'
import { getNotificationSettings } from '../../apis/profile-settings'
import { detectPushDevice, enablePushOnThisDevice, type PushDeviceState } from '../../services/push-messaging'
import bellIcon from '../../assets/icons/bell.svg'

const DISMISS_KEY = 'ddorang:push-card-dismissed-at'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? '0')
    return at > 0 && Date.now() - at < DISMISS_MS
  } catch { return false }
}

type Guide = { title: string; lines: string[] }

const GUIDES: Record<Exclude<PushDeviceState, 'ask' | 'granted'>, Guide> = {
  blocked: {
    title: '이 기기의 알림이 차단돼 있어요',
    lines: [
      '주소창 왼쪽의 자물쇠(사이트 설정)를 눌러 알림을 ‘허용’으로 바꿔 주세요.',
      '바꾼 뒤 아래 버튼을 누르면 바로 켜져요.',
    ],
  },
  'ios-install': {
    title: '아이폰은 홈 화면에 추가해야 알림을 받아요',
    lines: [
      '1. 브라우저의 공유 버튼을 눌러요.',
      '2. ‘홈 화면에 추가’를 골라요.',
      '3. 홈 화면의 또랑 아이콘으로 열고 ‘알림 받기’를 눌러요.',
    ],
  },
  'in-app': {
    title: '이 화면에서는 알림을 켤 수 없어요',
    lines: [
      '카카오톡 같은 앱 안에서 열린 화면이에요.',
      '메뉴에서 ‘다른 브라우저로 열기’를 누르거나, 주소를 복사해 Chrome·Safari에서 열어 주세요.',
    ],
  },
  unsupported: {
    title: '이 브라우저는 푸시 알림을 받을 수 없어요',
    lines: ['점검 요청은 알림 탭에서 계속 확인할 수 있어요.'],
  },
}

type Props = {
  /** page: 알림 탭·설정에 항상 보이는 안내. banner: 닫을 수 있는 권유 (닫으면 7일 동안 숨김) */
  variant?: 'page' | 'banner'
  className?: string
  /** 알림을 켠 직후 호출됩니다. 같은 화면의 스위치를 다시 불러올 때 씁니다. */
  onEnabled?: () => void
}

/**
 * 이 기기에서 비 예보 푸시를 받도록 안내합니다.
 * 브라우저 권한 창은 사용자가 ‘알림 받기’를 누른 순간에만 뜹니다.
 */
export default function PushOptInCard({ variant = 'page', className = '', onEnabled }: Props) {
  const queryClient = useQueryClient()
  const [device, setDevice] = useState<PushDeviceState>(detectPushDevice)
  const [dismissed, setDismissed] = useState(() => variant === 'banner' && recentlyDismissed())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [justEnabled, setJustEnabled] = useState(false)
  const [copied, setCopied] = useState(false)

  const canAsk = device === 'ask' || device === 'granted'
  const settings = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
    enabled: canAsk && !dismissed,
    staleTime: 60_000,
  })

  if (dismissed) return null
  // 닫을 수 있는 권유는 사용자가 지금 할 수 있는 일이 있을 때만 보여 줍니다.
  if (variant === 'banner' && (device === 'unsupported' || device === 'blocked')) return null

  if (justEnabled) {
    return (
      <section role="status" className={`break-keep rounded-[22px] border border-[#DDEFE6] bg-[#EAF8F2] px-4 py-3.5 ${className}`}>
        <p className="text-[15px] font-bold leading-6 text-[#247A4B]">알림을 켰어요</p>
        <p className="mt-0.5 text-[14px] leading-6 text-[#247A4B]">비 예보가 있으면 이 기기로 미리 알려 드릴게요.</p>
      </section>
    )
  }

  if (canAsk) {
    // 서버 설정을 아직 모르면 깜빡임을 막기 위해 잠시 비워 둡니다.
    if (device === 'granted' && (settings.isPending || settings.data?.notifications === true)) return null
  }

  const enable = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await enablePushOnThisDevice()
      setJustEnabled(true)
      onEnabled?.()
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setDevice(detectPushDevice())
      void queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      setBusy(false)
    }
  }

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* 저장소 접근 불가 */ }
    setDismissed(true)
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
    } catch {
      setError(`주소를 복사하지 못했어요. 직접 입력해 주세요: ${window.location.host}`)
    }
  }

  const guide = canAsk ? null : GUIDES[device]
  const hasAction = canAsk || device === 'blocked' || device === 'in-app' || variant === 'banner'
  const title = guide?.title ?? (device === 'granted' ? '비 예보 알림이 꺼져 있어요' : '비 오기 전에 미리 알려 드릴게요')

  return (
    <section aria-label="푸시 알림 안내" className={`break-keep rounded-[22px] border border-[#D5E4F7] bg-[#EFF6FF] px-4 py-3.5 ${className}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF]">
          <img src={bellIcon} alt="" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold leading-6 text-[#203451]">{title}</h2>
          {guide ? (
            <ul className="mt-1 space-y-0.5 text-[14px] leading-6 text-[#3E5670]">
              {guide.lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] leading-6 text-[#3E5670]">
              비 예보가 있으면 점검 요청을 미리 보내요. 알림을 켜 두면 앱을 열지 않아도 놓치지 않아요.
            </p>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-2 text-[13px] leading-5 text-[#B84D4D]">{error}</p>}

      {hasAction && <div className="mt-3 flex gap-2">
        {(canAsk || device === 'blocked') && (
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl bg-[#3981F7] px-3 text-[15px] font-bold text-white hover:bg-[#2870E6] disabled:opacity-50"
          >
            {busy ? '켜는 중…' : device === 'blocked' ? '허용했어요, 다시 켜기' : '알림 받기'}
          </button>
        )}
        {device === 'in-app' && (
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="min-h-11 flex-1 rounded-xl bg-[#3981F7] px-3 text-[15px] font-bold text-white hover:bg-[#2870E6]"
          >
            {copied ? '주소를 복사했어요' : '주소 복사'}
          </button>
        )}
        {variant === 'banner' && (
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 rounded-xl border border-[#D5E4F7] bg-white px-4 text-[14px] font-bold text-[#3E5670]"
          >
            나중에
          </button>
        )}
      </div>}
    </section>
  )
}
