import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { changeNickname, getErrorMessage } from '../../apis/auth'
import { NICKNAME_LENGTH_HINT, validateNickname } from './nickname-policy'
import './nickname-dialog.css'

type Props = {
  currentNickname: string
  onClose?: () => void
  onChanged: (nickname: string) => void
  forced?: boolean
}

type Step = 'notice' | 'pledge' | 'edit'
const NOTICE = '다른 사람에게 불쾌감을 주거나, 운영 원칙에 맞지 않는 닉네임은 사용하실 수 없습니다.'
const PLEDGE = '다른 사람에게 불쾌감을 주는 닉네임을 사용하지 않겠습니다.'

export default function NicknameChangeDialog({ currentNickname, onClose, onChanged, forced = false }: Props) {
  const titleId = useId()
  const nicknameInputId = useId()
  const nicknameHintId = useId()
  const [step, setStep] = useState<Step>('notice')
  const [confirmation, setConfirmation] = useState('')
  const [nickname, setNickname] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const validation = validateNickname(nickname)
  const canSave = validation.valid && validation.value !== currentNickname.trim()
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validation.valid || !canSave || pending) return
    setPending(true)
    setError('')
    try {
      await changeNickname(validation.value)
      onChanged(validation.value)
    } catch (caught: unknown) {
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
          <label className="dd-nick-label" htmlFor={nicknameInputId}>새 닉네임</label>
          <input
            id={nicknameInputId}
            className="dd-nick-input"
            value={nickname}
            onChange={event => {
              setNickname(event.target.value)
              setError('')
            }}
            autoCapitalize="off"
            autoComplete="nickname"
            spellCheck={false}
            required
            disabled={pending}
            aria-describedby={nicknameHintId}
            aria-invalid={nickname.length > 0 && !validation.valid}
          />
          <p id={nicknameHintId} className="dd-nick-help">
            {!validation.valid && nickname.length > 0 ? validation.reason : NICKNAME_LENGTH_HINT}
          </p>
          {error && <p role="alert" className="dd-nick-error">{error}</p>}
          <button type="submit" className="dd-nick-primary" disabled={pending || !canSave}>{pending ? '변경 중…' : '변경'}</button>
        </form>}
      </section>
    </div>
  )
  return createPortal(content, document.body)
}
