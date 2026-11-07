import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { changeNickname, getErrorMessage } from '../../apis/auth'
import { CURRENT_SOCIAL_USER_ID, MOCK_SOCIAL_USERS } from '../../mocks/social'
import { validateNickname } from './nickname-policy'
import './nickname-dialog.css'

type Props = {
  currentNickname: string
  onClose?: () => void
  onChanged: (nickname: string) => void
  forced?: boolean
}

type Step = 'notice' | 'pledge' | 'edit'
type Check = 'idle' | 'ok' | 'taken'
const NOTICE = '다른 사람에게 불쾌감을 주거나, 운영 원칙에 맞지 않는 닉네임은 사용하실 수 없습니다.'
const PLEDGE = '다른 사람에게 불쾌감을 주는 닉네임을 사용하지 않겠습니다.'
const DUPLICATE_MESSAGE = '이미 존재하거나, 운영원칙에 맞지 않는 닉네임입니다.'

/** 닉네임 중복 확인은 목 사용자만 비교합니다. 실제 전체 중복·금칙어 검증은 서버 API가 필요합니다. */
export default function NicknameChangeDialog({ currentNickname, onClose, onChanged, forced = false }: Props) {
  const titleId = useId()
  const [step, setStep] = useState<Step>('notice')
  const [confirmation, setConfirmation] = useState('')
  const [nickname, setNickname] = useState('')
  const [check, setCheck] = useState<Check>('idle')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const validation = validateNickname(nickname)
  const requested = forced ? PLEDGE : '동의'
  const canClose = !forced && Boolean(onClose)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && canClose) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey) }
  }, [canClose, onClose])

  function duplicateCheck() {
    if (!validation.valid || nickname === currentNickname) return
    const alreadyUsedInDemo = MOCK_SOCIAL_USERS.some(user => user.id !== CURRENT_SOCIAL_USER_ID && user.nickname.toLowerCase() === nickname.toLowerCase())
    setCheck(alreadyUsedInDemo ? 'taken' : 'ok')
    setError('')
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validation.valid || check !== 'ok' || nickname === currentNickname || pending) return
    setPending(true)
    setError('')
    try {
      // 최종 저장은 기존 백엔드 API로 수행하며, 서버가 반환한 오류를 우선합니다.
      await changeNickname(nickname)
      onChanged(nickname)
    } catch (caught: unknown) {
      setCheck('taken')
      setError(getErrorMessage(caught))
    } finally { setPending(false) }
  }

  const content = (
    <div className="dd-nick-backdrop" onMouseDown={event => {
      if (canClose && event.target === event.currentTarget) onClose?.()
    }}>
      <section className={`dd-nick-dialog${forced ? ' dd-nick-forced' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="dd-nick-heading">
          <h2 id={titleId}>{forced ? '닉네임 이용 제한' : '닉네임 변경'}</h2>
          {canClose && <button className="dd-nick-close" type="button" aria-label="닫기" onClick={onClose}>×</button>}
        </div>
        {step === 'notice' && <div className="dd-nick-flow">
          <p className={forced ? 'dd-nick-warning' : 'dd-nick-notice'}>
            {forced ? '운영원칙에 위배되는 닉네임으로 신고가 접수되어 닉네임이 일시적으로 비활성화 되었으며, 닉네임 변경 후 앱을 이용하실 수 있습니다.' : NOTICE}
          </p>
          {forced ? (
            <button className="dd-nick-primary" type="button" onClick={() => { setStep('pledge'); setConfirmation('') }}>다음</button>
          ) : <>
            <label className="dd-nick-label" htmlFor="dd-nick-agree">진행하려면 ‘동의’를 입력해 주세요.</label>
            <input id="dd-nick-agree" className="dd-nick-input" value={confirmation} autoComplete="off" onChange={event => setConfirmation(event.target.value)} placeholder="동의" />
            <button className="dd-nick-primary" type="button" disabled={confirmation !== '동의'} onClick={() => setStep('edit')}>다음</button>
          </>}
        </div>}
        {step === 'pledge' && <div className="dd-nick-flow">
          <label className="dd-nick-label" htmlFor="dd-nick-pledge">아래 문장을 정확하게 입력해 주세요.</label>
          <p className="dd-nick-notice">{PLEDGE}</p>
          <textarea id="dd-nick-pledge" className="dd-nick-input dd-nick-pledge" value={confirmation} onChange={event => setConfirmation(event.target.value)} rows={2} />
          <button className="dd-nick-primary" type="button" disabled={confirmation !== requested} onClick={() => { setConfirmation(''); setStep('edit') }}>변경</button>
        </div>}
        {step === 'edit' && <form className="dd-nick-flow" onSubmit={save}>
          <label className="dd-nick-label" htmlFor="dd-nick-value">새 닉네임</label>
          <div className="dd-nick-input-row">
            <input id="dd-nick-value" className="dd-nick-input" value={nickname} onChange={event => { setNickname(event.target.value); setCheck('idle'); setError('') }} maxLength={12} autoCapitalize="off" autoComplete="off" spellCheck={false} placeholder="한글 2~6자 / 영어 2~12자" aria-invalid={nickname.length > 0 && !validation.valid} />
            <button type="button" className="dd-nick-check" disabled={!validation.valid || nickname === currentNickname || pending} onClick={duplicateCheck}>중복 확인</button>
          </div>
          <p className="dd-nick-help">한글 2~6자 · 영어 2~12자 · 숫자 2~6자 / 한·영 혼합 및 특수문자 불가</p>
          {!validation.valid && nickname.length > 0 && <p role="alert" className="dd-nick-error">{validation.reason}</p>}
          {check === 'taken' && <p role="alert" className="dd-nick-error">{DUPLICATE_MESSAGE}</p>}
          {check === 'ok' && <p role="status" className="dd-nick-success">사용 가능한 닉네임입니다!</p>}
          {error && <p role="alert" className="dd-nick-error">서버 응답: {error}</p>}
          <p className="dd-nick-disclaimer">중복 확인은 현재 시연용 사용자 목록 기준입니다. 전체 회원 중복·운영원칙 판정은 백엔드 API 연동이 필요하며, 저장 시 서버에서 최종 확인됩니다.</p>
          <button type="submit" className="dd-nick-primary" disabled={pending || check !== 'ok' || !validation.valid || nickname === currentNickname}>{pending ? '변경 중…' : '변경'}</button>
        </form>}
      </section>
    </div>
  )
  return createPortal(content, document.body)
}
