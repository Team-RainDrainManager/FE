import { useId, useState } from 'react'

export type Decision = 'approve' | 'reject' | 'sanction'

type Props = {
  onDecide: (decision: Decision, comment: string) => void
  busy: boolean
  error: string
  approveLabel?: string
  rejectLabel?: string
  canSanction?: boolean
  commentLabel: string
}

/**
 * 승인, 반려, 제재 전에 결정을 확인합니다. 반려와 제재는 사유가 필요합니다.
 */
export default function DecisionBar({
  onDecide,
  busy,
  error,
  approveLabel = '승인',
  rejectLabel = '반려',
  canSanction = false,
  commentLabel,
}: Props) {
  const commentId = useId()
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState<Decision | null>(null)
  const [localError, setLocalError] = useState('')
  const labels = { approve: approveLabel, reject: rejectLabel, sanction: '반려 및 제재' }
  const confirmation = pending === 'sanction' && !canSanction ? null : pending

  const choose = (decision: Decision) => {
    setLocalError('')
    if (decision !== 'approve' && !comment.trim()) {
      setLocalError(`${labels[decision]}하려면 사유를 적어 주세요. 사용자에게 그대로 전달돼요.`)
      return
    }
    setPending(decision)
  }

  return (
    <div className="mt-3 space-y-2">
      <label htmlFor={commentId} className="block text-[13px] font-bold text-[#203451]">
        {commentLabel}
      </label>
      <textarea
        id={commentId}
        rows={2}
        maxLength={500}
        value={comment}
        disabled={busy}
        onChange={(event) => { setComment(event.target.value); setLocalError(''); setPending(null) }}
        placeholder={canSanction ? '반려 또는 제재 사유를 적어 주세요.' : '반려할 때는 꼭 적어 주세요.'}
        className="block w-full resize-none rounded-xl border border-[#DFE5F0] bg-white px-3 py-2.5 text-[14px] leading-5 text-[#203451] outline-none focus:border-[#3981F7]"
      />

      {(localError || error) && (
        <p role="alert" className="text-[13px] leading-5 text-[#B84D4D]">{localError || error}</p>
      )}

      {confirmation ? (
        <div role="group" aria-label="처리 확인" className="rounded-xl bg-[#F4F7FB] p-3">
          <p className="text-[14px] font-bold text-[#203451]">
            {labels[confirmation]}할까요? 처리한 뒤에는 되돌릴 수 없어요.
          </p>
          {confirmation === 'sanction' && (
            <p className="mt-1 text-[13px] leading-5 text-[#B84D4D]">
              제보자의 점검과 대신 점검이 제한됩니다. 입력한 사유는 제보자에게 그대로 전달돼요.
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className="min-h-11 rounded-xl border border-[#DCE5F0] bg-white text-[14px] font-bold text-[#53647E] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(confirmation, comment)}
              className={`min-h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-50 ${confirmation === 'sanction' ? 'bg-[#B84D4D]' : 'bg-[#3981F7]'}`}
            >
              {busy ? '처리 중…' : `${labels[confirmation]} 확정`}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => choose('reject')}
            className="min-h-11 rounded-xl border border-[#DCE5F0] bg-white text-[14px] font-bold text-[#53647E] disabled:opacity-50"
          >
            {rejectLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => choose('approve')}
            className="min-h-11 rounded-xl bg-[#3981F7] text-[14px] font-bold text-white disabled:opacity-50"
          >
            {approveLabel}
          </button>
          {canSanction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => choose('sanction')}
              className="col-span-2 min-h-11 rounded-xl border border-[#F0CBD0] bg-[#FFF1F1] text-[14px] font-bold text-[#A73745] disabled:opacity-50 [html[data-dd-theme=dark]_&]:border-[#743843] [html[data-dd-theme=dark]_&]:bg-[#351F2B] [html[data-dd-theme=dark]_&]:text-[#FFD0D6]"
            >
              반려 및 제재
            </button>
          )}
        </div>
      )}
    </div>
  )
}
